import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { createSignatureHeader } from "./lib/hmac";
import {
  automationEventValidator,
  automationStatusValidator,
  automationWorkflowValidator,
} from "./schema";

const MAX_DISPATCH_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [500, 1500];

const EVENT_LABELS: Record<
  | "request.created"
  | "request.approved"
  | "request.declined"
  | "loan.returned"
  | "loan.overdue_reminder",
  string
> = {
  "request.created": "Borrow request notification",
  "request.approved": "Approval notification",
  "request.declined": "Decline notification",
  "loan.returned": "Return confirmation",
  "loan.overdue_reminder": "Overdue reminder",
};

export const getLogsForLoan = internalQuery({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("automationLogs")
      .withIndex("by_loan", (q) => q.eq("loanId", args.loanId))
      .collect();
  },
});

/**
 * Test helper: Seeds a sample overdue loan to test the full lifecycle,
 * n8n overdue reminder workflow, and recent activity timeline.
 */
export const createTestOverdueLoan = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    const tool = await ctx.db.query("tools").first();
    if (!user || !tool) {
      throw new Error("Cannot seed test loan: requires at least 1 user and 1 tool in database.");
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const loanId = await ctx.db.insert("loans", {
      toolId: tool._id,
      borrowerId: user._id,
      lenderId: user._id,
      startDate: now - 5 * dayMs,
      endDate: now - 2 * dayMs, // 2 days overdue!
      status: "approved",
      reminderCount: 0,
      createdAt: now - 6 * dayMs,
      updatedAt: now,
    });

    return loanId;
  },
});

/**
 * Records an automation dispatch or n8n write-back in `automationLogs` idempotently.
 * If `idempotencyKey` already exists, returns early without creating duplicate logs or updating reminder counts.
 */
export const recordAutomationLog = internalMutation({
  args: {
    loanId: v.id("loans"),
    workflow: automationWorkflowValidator,
    event: automationEventValidator,
    status: automationStatusValidator,
    recipientEmail: v.string(),
    summary: v.string(),
    idempotencyKey: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ deduplicated: boolean; logId: Id<"automationLogs"> | null }> => {
    const existing = await ctx.db
      .query("automationLogs")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .unique();

    if (existing) {
      return { deduplicated: true, logId: existing._id };
    }

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      // Loan may have been cancelled/deleted while the webhook was in flight
      return { deduplicated: false, logId: null };
    }

    const now = Date.now();
    const logId = await ctx.db.insert("automationLogs", {
      loanId: args.loanId,
      workflow: args.workflow,
      event: args.event,
      status: args.status,
      recipientEmail: args.recipientEmail,
      summary: args.summary,
      idempotencyKey: args.idempotencyKey,
      errorMessage: args.errorMessage,
      createdAt: now,
    });

    // Update loan reminder tracking only when an overdue reminder is successfully delivered
    if (
      args.event === "loan.overdue_reminder" &&
      args.status === "delivered"
    ) {
      await ctx.db.patch(loan._id, {
        lastReminderSentAt: now,
        reminderCount: loan.reminderCount + 1,
        updatedAt: now,
      });
    }

    return { deduplicated: false, logId };
  },
});

/**
 * Queries overdue active loans (`status === "approved"` and `endDate < now`)
 * using the `by_status_and_end_date` index, returning only minimal fields needed by n8n.
 */
export const getOverdueLoans = internalQuery({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const overdueLoans = await ctx.db
      .query("loans")
      .withIndex("by_status_and_end_date", (q) =>
        q.eq("status", "approved").lt("endDate", args.now)
      )
      .take(100);

    const dayMs = 1000 * 60 * 60 * 24;

    return await Promise.all(
      overdueLoans.map(async (loan) => {
        const [tool, borrower, lender] = await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.borrowerId),
          ctx.db.get(loan.lenderId),
        ]);

        return {
          loanId: loan._id,
          startDate: loan.startDate,
          endDate: loan.endDate,
          daysOverdue: Math.max(1, Math.floor((args.now - loan.endDate) / dayMs)),
          lastReminderSentAt: loan.lastReminderSentAt ?? null,
          reminderCount: loan.reminderCount,
          toolName: tool?.name ?? "Tool",
          borrowerName: borrower?.name ?? "Neighbor",
          borrowerEmail: borrower?.email ?? "",
          lenderName: lender?.name ?? "Owner",
        };
      })
    );
  },
});

/**
 * Dispatches a signed webhook event to n8n when a borrow request is created or changes status.
 * Uses HMAC-SHA256 signing, sends only required fields, retries transient errors, and logs outcome.
 */
export const dispatchLoanEvent = internalAction({
  args: {
    event: v.union(
      v.literal("request.created"),
      v.literal("request.approved"),
      v.literal("request.declined"),
      v.literal("loan.returned")
    ),
    loanId: v.id("loans"),
    toolName: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    recipientName: v.string(),
    recipientEmail: v.string(),
    actorName: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const webhookUrl = env.N8N_REQUEST_WEBHOOK_URL;
    const secret = env.N8N_WEBHOOK_SECRET;
    const baseKey = `${args.event}:${args.loanId}:${args.timestamp}`;
    const dispatchKey = `${baseKey}:dispatch`;
    const eventLabel = EVENT_LABELS[args.event];

    if (!webhookUrl) {
      const errorMessage = "N8N_REQUEST_WEBHOOK_URL is not configured in Convex env.";
      console.warn(`[n8n] Skipping ${args.event} webhook: ${errorMessage}`);
      const _logRes: { deduplicated: boolean; logId: Id<"automationLogs"> | null } =
        await ctx.runMutation(internal.n8n.recordAutomationLog, {
          loanId: args.loanId,
          workflow: "request_notification",
          event: args.event,
          status: "failed",
          recipientEmail: args.recipientEmail,
          summary: `${eventLabel} not sent (webhook URL missing)`,
          idempotencyKey: dispatchKey,
          errorMessage,
        });
      void _logRes;
      return;
    }

    if (!secret) {
      const errorMessage = "N8N_WEBHOOK_SECRET is not configured in Convex env.";
      console.error(`[n8n] Aborting ${args.event} webhook: ${errorMessage}`);
      const _logRes: { deduplicated: boolean; logId: Id<"automationLogs"> | null } =
        await ctx.runMutation(internal.n8n.recordAutomationLog, {
          loanId: args.loanId,
          workflow: "request_notification",
          event: args.event,
          status: "failed",
          recipientEmail: args.recipientEmail,
          summary: `${eventLabel} failed (webhook secret missing)`,
          idempotencyKey: dispatchKey,
          errorMessage,
        });
      void _logRes;
      return;
    }

    // Minimal payload containing only what n8n needs to notify the user
    const payload = {
      event: args.event,
      idempotencyKey: baseKey,
      timestamp: args.timestamp,
      loan: {
        id: args.loanId,
        startDate: args.startDate,
        endDate: args.endDate,
      },
      tool: {
        name: args.toolName,
      },
      recipient: {
        name: args.recipientName,
        email: args.recipientEmail,
      },
      actor: {
        name: args.actorName,
      },
    };

    const rawBody = JSON.stringify(payload);
    const signatureHeader = await createSignatureHeader(
      secret,
      args.timestamp,
      rawBody
    );

    let lastError = "Unknown dispatch failure";

    for (let attempt = 1; attempt <= MAX_DISPATCH_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-LendLoop-Signature": signatureHeader,
          },
          body: rawBody,
        });

        if (response.ok) {
          const _logRes: { deduplicated: boolean; logId: Id<"automationLogs"> | null } =
            await ctx.runMutation(internal.n8n.recordAutomationLog, {
              loanId: args.loanId,
              workflow: "request_notification",
              event: args.event,
              status: "dispatched",
              recipientEmail: args.recipientEmail,
              summary: `${eventLabel} sent to n8n for ${args.recipientEmail}`,
              idempotencyKey: dispatchKey,
            });
          void _logRes;
          return;
        }

        const errorBody = await response.text().catch(() => "");
        lastError = `HTTP ${response.status}: ${errorBody.slice(0, 200)}`;

        // Do not retry client errors (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      if (attempt < MAX_DISPATCH_ATTEMPTS) {
        const delayMs = RETRY_BACKOFF_MS[attempt - 1] ?? 1500;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    console.error(
      `[n8n] Failed to dispatch ${args.event} for loan ${args.loanId}: ${lastError}`
    );

    const _failLog: { deduplicated: boolean; logId: Id<"automationLogs"> | null } =
      await ctx.runMutation(internal.n8n.recordAutomationLog, {
        loanId: args.loanId,
        workflow: "request_notification",
        event: args.event,
        status: "failed",
        recipientEmail: args.recipientEmail,
        summary: `${eventLabel} delivery to n8n failed`,
        idempotencyKey: dispatchKey,
        errorMessage: lastError,
      });
    void _failLog;
  },
});


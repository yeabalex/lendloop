import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { env, httpAction } from "./_generated/server";
import { verifySignature } from "./lib/hmac";

const http = httpRouter();

const VALID_WORKFLOWS = new Set(["request_notification", "overdue_reminder"]);
const VALID_EVENTS = new Set([
  "request.created",
  "request.approved",
  "request.declined",
  "loan.returned",
  "loan.overdue_reminder",
]);
const VALID_STATUSES = new Set(["dispatched", "delivered", "failed"]);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Lightweight health-check endpoint for deployment sanity checks.
 */
http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async () => {
    return jsonResponse({ status: "ok", service: "lendloop-convex" });
  }),
});

/**
 * HMAC-authenticated endpoint polled daily by n8n's Overdue Reminders workflow.
 * Returns active approved loans where `endDate < Date.now()`, containing only fields needed for reminders.
 */
http.route({
  path: "/api/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const secret = env.N8N_WEBHOOK_SECRET;
    if (!secret) {
      return jsonResponse({ error: "Webhook secret is not configured" }, 500);
    }

    const signatureHeader = request.headers.get("X-LendLoop-Signature");
    const verification = await verifySignature(secret, signatureHeader, "");

    if (!verification.valid) {
      return jsonResponse(
        { error: verification.reason ?? "Unauthorized" },
        401
      );
    }

    const now = Date.now();
    const overdueLoans = await ctx.runQuery(internal.n8n.getOverdueLoans, {
      now,
    });

    return jsonResponse({
      overdueLoans,
      count: overdueLoans.length,
      fetchedAt: now,
    });
  }),
});

/**
 * HMAC-authenticated write-back webhook called by n8n after sending notifications or overdue reminders.
 * Strictly validates payload shape and uses `idempotencyKey` to prevent duplicate logs or reminders on retries.
 */
http.route({
  path: "/api/webhooks/n8n",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = env.N8N_WEBHOOK_SECRET;
    if (!secret) {
      return jsonResponse({ error: "Webhook secret is not configured" }, 500);
    }

    const rawBody = await request.text();
    const signatureHeader = request.headers.get("X-LendLoop-Signature");
    const verification = await verifySignature(secret, signatureHeader, rawBody);

    if (!verification.valid) {
      return jsonResponse(
        { error: verification.reason ?? "Unauthorized" },
        401
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!isRecord(parsed)) {
      return jsonResponse({ error: "Payload must be a JSON object" }, 400);
    }

    const {
      loanId,
      workflow,
      event,
      status,
      recipientEmail,
      summary,
      idempotencyKey,
      errorMessage,
    } = parsed;

    if (typeof loanId !== "string" || !loanId.trim()) {
      return jsonResponse({ error: "Missing or invalid loanId" }, 400);
    }
    if (typeof workflow !== "string" || !VALID_WORKFLOWS.has(workflow)) {
      return jsonResponse({ error: "Invalid workflow type" }, 400);
    }
    if (typeof event !== "string" || !VALID_EVENTS.has(event)) {
      return jsonResponse({ error: "Invalid event type" }, 400);
    }
    if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
      return jsonResponse({ error: "Invalid automation status" }, 400);
    }
    if (typeof recipientEmail !== "string") {
      return jsonResponse({ error: "Missing recipientEmail" }, 400);
    }
    if (typeof summary !== "string" || !summary.trim()) {
      return jsonResponse({ error: "Missing summary" }, 400);
    }
    if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
      return jsonResponse({ error: "Missing idempotencyKey" }, 400);
    }
    if (errorMessage !== undefined && typeof errorMessage !== "string") {
      return jsonResponse({ error: "errorMessage must be a string" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.n8n.recordAutomationLog, {
        loanId: loanId as Id<"loans">,
        workflow: workflow as "request_notification" | "overdue_reminder",
        event: event as
          | "request.created"
          | "request.approved"
          | "request.declined"
          | "loan.returned"
          | "loan.overdue_reminder",
        status: status as "dispatched" | "delivered" | "failed",
        recipientEmail,
        summary,
        idempotencyKey,
        errorMessage,
      });

      return jsonResponse({
        ok: true,
        deduplicated: result.deduplicated,
        logId: result.logId,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to record automation log";
      return jsonResponse({ error: message }, 400);
    }
  }),
});

export default http;


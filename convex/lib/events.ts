import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type LoanWebhookEvent =
  | "request.created"
  | "request.approved"
  | "request.declined"
  | "loan.returned";

interface ScheduleLoanWebhookParams {
  event: LoanWebhookEvent;
  loanId: Id<"loans">;
  toolName: string;
  startDate: number;
  endDate: number;
  recipientId: Id<"users">;
  actorName: string;
  timestamp: number;
}

/**
 * Resolves the recipient's minimal contact info (`name`, `email`) and schedules
 * an async n8n webhook dispatch via Convex's transaction-safe scheduler.
 */
export async function scheduleLoanWebhook(
  ctx: MutationCtx,
  params: ScheduleLoanWebhookParams
): Promise<void> {
  const recipient = await ctx.db.get(params.recipientId);
  if (!recipient || !recipient.email) {
    return;
  }

  await ctx.scheduler.runAfter(0, internal.n8n.dispatchLoanEvent, {
    event: params.event,
    loanId: params.loanId,
    toolName: params.toolName,
    startDate: params.startDate,
    endDate: params.endDate,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    actorName: params.actorName,
    timestamp: params.timestamp,
  });
}


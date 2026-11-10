import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./lib/auth";
import { scheduleLoanWebhook } from "./lib/events";

/**
 * Shared enrichment helper for loan views (`listMyRequests`, `listIncoming`, `listAllAdmin`).
 * Hydrates tool, borrower, lender, and recent automation activity logs.
 */
async function enrichLoans(ctx: QueryCtx, loans: Doc<"loans">[]) {
  return await Promise.all(
    loans.map(async (loan) => {
      const [tool, borrower, lender, rawLogs] = await Promise.all([
        ctx.db.get(loan.toolId),
        ctx.db.get(loan.borrowerId),
        ctx.db.get(loan.lenderId),
        ctx.db
          .query("automationLogs")
          .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
          .order("desc")
          .take(10),
      ]);

      // Filter out internal intermediate 'dispatched' logs when final 'delivered' logs exist
      const deliveredOrFailed = rawLogs.filter((log) => log.status !== "dispatched");
      const recentLogs = (deliveredOrFailed.length > 0 ? deliveredOrFailed : rawLogs).slice(0, 5);

      return {
        ...loan,
        tool: tool
          ? {
              _id: tool._id,
              name: tool.name,
              category: tool.category,
              condition: tool.condition,
              isAvailable: tool.isAvailable,
            }
          : null,
        borrower: borrower
          ? {
              _id: borrower._id,
              name: borrower.name,
              email: borrower.email,
            }
          : null,
        lender: lender
          ? {
              _id: lender._id,
              name: lender.name,
              email: lender.email,
              isTrustedLender: lender.isTrustedLender,
            }
          : null,
        automationLogs: recentLogs,
      };
    })
  );
}

/**
 * Authenticated query: Borrow requests & loans initiated by the current user ("My requests").
 */
export const listMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .order("desc")
      .take(100);

    return await enrichLoans(ctx, loans);
  },
});

/**
 * Authenticated query: Requests & active loans on tools owned by the current user ("Incoming requests").
 */
export const listIncoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .order("desc")
      .take(100);

    return await enrichLoans(ctx, loans);
  },
});

/**
 * Admin-only query: View all borrow requests & loans across the entire neighborhood.
 */
export const listAllAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const loans = await ctx.db.query("loans").order("desc").take(200);
    return await enrichLoans(ctx, loans);
  },
});

/**
 * Authenticated mutation: Request to borrow an available tool for a date range.
 */
export const requestLoan = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.number(),
    endDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const borrower = await requireUser(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tool not found.",
      });
    }

    if (tool.ownerId === borrower._id) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "You cannot request to borrow your own tool.",
      });
    }

    if (!tool.isAvailable) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "This tool is currently out on loan.",
      });
    }

    if (args.endDate <= args.startDate) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Return date must be after the pickup date.",
      });
    }

    // Prevent duplicate pending requests by the same borrower for the same tool
    for await (const existing of ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", args.toolId))) {
      if (
        existing.borrowerId === borrower._id &&
        existing.status === "pending"
      ) {
        throw new ConvexError({
          code: "CONFLICT",
          message: "You already have a pending borrow request for this tool.",
        });
      }
    }

    const now = Date.now();
    const trimmedNotes = args.notes?.trim();

    const loanId = await ctx.db.insert("loans", {
      toolId: tool._id,
      borrowerId: borrower._id,
      lenderId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      notes: trimmedNotes ? trimmedNotes : undefined,
      reminderCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await scheduleLoanWebhook(ctx, {
      event: "request.created",
      loanId,
      toolName: tool.name,
      startDate: args.startDate,
      endDate: args.endDate,
      recipientId: tool.ownerId,
      actorName: borrower.name,
      timestamp: now,
    });

    return loanId;
  },
});

/**
 * Authenticated mutation: Approve an incoming borrow request on one's own tool.
 * Marks the tool unavailable and declines competing pending requests on the same tool.
 */
export const approveLoan = mutation({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Borrow request not found.",
      });
    }

    if (loan.lenderId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the tool owner can approve requests on their own tool.",
      });
    }

    if (loan.status !== "pending") {
      throw new ConvexError({
        code: "CONFLICT",
        message: `Cannot approve a request that is already ${loan.status}.`,
      });
    }

    const tool = await ctx.db.get(loan.toolId);
    if (!tool) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Associated tool no longer exists.",
      });
    }

    if (!tool.isAvailable) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "This tool is already out on an active loan.",
      });
    }

    const now = Date.now();

    await ctx.db.patch(loan._id, {
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(tool._id, {
      isAvailable: false,
      updatedAt: now,
    });

    await scheduleLoanWebhook(ctx, {
      event: "request.approved",
      loanId: loan._id,
      toolName: tool.name,
      startDate: loan.startDate,
      endDate: loan.endDate,
      recipientId: loan.borrowerId,
      actorName: user.name,
      timestamp: now,
    });

    // Decline other competing pending requests for the same tool
    for await (const other of ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", tool._id))) {
      if (other._id !== loan._id && other.status === "pending") {
        await ctx.db.patch(other._id, {
          status: "declined",
          declinedAt: now,
          updatedAt: now,
        });

        await scheduleLoanWebhook(ctx, {
          event: "request.declined",
          loanId: other._id,
          toolName: tool.name,
          startDate: other.startDate,
          endDate: other.endDate,
          recipientId: other.borrowerId,
          actorName: user.name,
          timestamp: now,
        });
      }
    }

    return loan._id;
  },
});

/**
 * Authenticated mutation: Decline an incoming borrow request on one's own tool.
 */
export const declineLoan = mutation({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Borrow request not found.",
      });
    }

    if (loan.lenderId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the tool owner can decline requests on their own tool.",
      });
    }

    if (loan.status !== "pending") {
      throw new ConvexError({
        code: "CONFLICT",
        message: `Cannot decline a request that is already ${loan.status}.`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(loan._id, {
      status: "declined",
      declinedAt: now,
      updatedAt: now,
    });

    const tool = await ctx.db.get(loan.toolId);
    await scheduleLoanWebhook(ctx, {
      event: "request.declined",
      loanId: loan._id,
      toolName: tool?.name ?? "Tool",
      startDate: loan.startDate,
      endDate: loan.endDate,
      recipientId: loan.borrowerId,
      actorName: user.name,
      timestamp: now,
    });

    return loan._id;
  },
});

/**
 * Authenticated mutation: Borrower cancels their own pending request.
 */
export const cancelRequest = mutation({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Borrow request not found.",
      });
    }

    if (loan.borrowerId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You can only cancel your own borrow requests.",
      });
    }

    if (loan.status !== "pending") {
      throw new ConvexError({
        code: "CONFLICT",
        message: `Cannot cancel a request that is already ${loan.status}.`,
      });
    }

    await ctx.db.delete(loan._id);
    return loan._id;
  },
});

/**
 * Authenticated mutation: Mark an approved loan as returned.
 * RBAC: Allowed for the tool lender or an admin. Restores tool availability.
 */
export const markReturned = mutation({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Loan not found.",
      });
    }

    if (loan.lenderId !== user._id && user.role !== "admin") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the tool lender or an admin can mark this loan as returned.",
      });
    }

    if (loan.status !== "approved") {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Only active approved loans can be marked as returned.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(loan._id, {
      status: "returned",
      returnedAt: now,
      updatedAt: now,
    });

    const tool = await ctx.db.get(loan.toolId);
    if (tool) {
      await ctx.db.patch(tool._id, {
        isAvailable: true,
        updatedAt: now,
      });
    }

    await scheduleLoanWebhook(ctx, {
      event: "loan.returned",
      loanId: loan._id,
      toolName: tool?.name ?? "Tool",
      startDate: loan.startDate,
      endDate: loan.endDate,
      recipientId: loan.borrowerId,
      actorName: user.name,
      timestamp: now,
    });

    return loan._id;
  },
});


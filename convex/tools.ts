import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwnerOrAdmin, requireUser } from "./lib/auth";
import { scheduleLoanWebhook } from "./lib/events";
import { toolCategoryValidator, toolConditionValidator } from "./schema";

/**
 * Public query: Read-only list of available tools.
 * STRICT PRIVACY REQUIREMENT: Returns only `name` and `category` (no owner details,
 * no condition, no descriptions).
 */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const availableTools = await ctx.db
      .query("tools")
      .withIndex("by_available", (q) => q.eq("isAvailable", true))
      .order("desc")
      .take(100);

    return availableTools.map((tool) => ({
      _id: tool._id,
      name: tool.name,
      category: tool.category,
    }));
  },
});

/**
 * Authenticated query: Browse all tools with availability status,
 * filterable by category, including owner display name and "Trusted Lender" status.
 */
export const listAll = query({
  args: {
    category: v.optional(v.union(v.literal("all"), toolCategoryValidator)),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx);

    const selectedCategory = args.category;
    const tools =
      selectedCategory && selectedCategory !== "all"
        ? await ctx.db
            .query("tools")
            .withIndex("by_category", (q) => q.eq("category", selectedCategory))
            .order("desc")
            .take(200)
        : await ctx.db.query("tools").order("desc").take(200);

    // Enrich with owner profile details and caller's pending request status
    return await Promise.all(
      tools.map(async (tool) => {
        const [owner, pendingLoan] = await Promise.all([
          ctx.db.get(tool.ownerId),
          ctx.db
            .query("loans")
            .withIndex("by_tool", (q) => q.eq("toolId", tool._id))
            .filter((q) =>
              q.and(
                q.eq(q.field("borrowerId"), currentUser._id),
                q.eq(q.field("status"), "pending")
              )
            )
            .first(),
        ]);

        return {
          ...tool,
          owner: owner
            ? {
                _id: owner._id,
                name: owner.name,
                isTrustedLender: owner.isTrustedLender,
              }
            : null,
          isOwner: currentUser._id === tool.ownerId,
          hasPendingRequest: Boolean(pendingLoan),
        };
      })
    );
  },
});

/**
 * Authenticated query: Returns only tools listed by the currently signed-in user.
 */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .take(200);

    return tools;
  },
});

/**
 * Query a single tool by its ID.
 */
export const getById = query({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      return null;
    }

    const owner = await ctx.db.get(tool.ownerId);

    return {
      ...tool,
      owner: owner
        ? {
            _id: owner._id,
            name: owner.name,
            isTrustedLender: owner.isTrustedLender,
          }
        : null,
      isOwner: currentUser._id === tool.ownerId,
    };
  },
});

/**
 * Authenticated mutation: List a new tool with name, category, condition, and short description.
 * `ownerId` is derived on the server from the verified session.
 */
export const create = mutation({
  args: {
    name: v.string(),
    category: toolCategoryValidator,
    condition: toolConditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const trimmedName = args.name.trim();
    const trimmedDescription = args.description.trim();

    if (!trimmedName) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Tool name cannot be empty.",
      });
    }

    const now = Date.now();
    const toolId = await ctx.db.insert("tools", {
      ownerId: user._id,
      name: trimmedName,
      category: args.category,
      condition: args.condition,
      description: trimmedDescription,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    });

    return toolId;
  },
});

/**
 * Authenticated mutation: Edit an existing tool.
 * RBAC: Only the tool owner or an admin can edit.
 */
export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: toolCategoryValidator,
    condition: toolConditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tool not found.",
      });
    }

    assertOwnerOrAdmin(user, tool.ownerId, "tool listing");

    const trimmedName = args.name.trim();
    const trimmedDescription = args.description.trim();

    if (!trimmedName) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Tool name cannot be empty.",
      });
    }

    await ctx.db.patch(args.toolId, {
      name: trimmedName,
      category: args.category,
      condition: args.condition,
      description: trimmedDescription,
      updatedAt: Date.now(),
    });

    return args.toolId;
  },
});

/**
 * Authenticated mutation: Delete a tool listing.
 * RBAC: Normal users can only delete their own tools. Admins can remove any listing.
 */
export const remove = mutation({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tool not found.",
      });
    }

    // Role check: Admin can remove any listing; user can only remove their own
    assertOwnerOrAdmin(user, tool.ownerId, "tool listing");

    // Check for active or pending loans on this tool
    const now = Date.now();
    for await (const loan of ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", args.toolId))) {
      if (loan.status === "approved") {
        throw new ConvexError({
          code: "CONFLICT",
          message:
            "Cannot delete a tool while it is actively on loan. Mark it returned first.",
        });
      }
      if (loan.status === "pending") {
        await ctx.db.patch(loan._id, {
          status: "declined",
          declinedAt: now,
          updatedAt: now,
        });

        await scheduleLoanWebhook(ctx, {
          event: "request.declined",
          loanId: loan._id,
          toolName: tool.name,
          startDate: loan.startDate,
          endDate: loan.endDate,
          recipientId: loan.borrowerId,
          actorName: user.name,
          timestamp: now,
        });
      }
    }

    await ctx.db.delete(args.toolId);
    return args.toolId;
  },
});


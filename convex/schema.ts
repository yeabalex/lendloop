import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const toolCategoryValidator = v.union(
  v.literal("power_tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("automotive"),
  v.literal("cleaning"),
  v.literal("other")
);

export const toolConditionValidator = v.union(
  v.literal("like_new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("worn")
);

export const userRoleValidator = v.union(
  v.literal("admin"),
  v.literal("user")
);

export const loanStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("returned")
);

export const automationWorkflowValidator = v.union(
  v.literal("request_notification"),
  v.literal("overdue_reminder")
);

export const automationEventValidator = v.union(
  v.literal("request.created"),
  v.literal("request.approved"),
  v.literal("request.declined"),
  v.literal("loan.returned"),
  v.literal("loan.overdue_reminder")
);

export const automationStatusValidator = v.union(
  v.literal("dispatched"),
  v.literal("delivered"),
  v.literal("failed")
);

export default defineSchema({
  /**
   * Synchronized from Clerk upon sign-in.
   * Stores application-specific RBAC role ("admin" | "user") and Trusted Lender badge.
   */
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: userRoleValidator,
    isTrustedLender: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"]),

  /**
   * Neighborhood tools listed by signed-in users.
   * Public query exposes only `name` and `category` for available tools.
   */
  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: toolCategoryValidator,
    condition: toolConditionValidator,
    description: v.string(),
    isAvailable: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"])
    .index("by_available", ["isAvailable"])
    .index("by_category_and_available", ["category", "isAvailable"]),

  /**
   * Unified borrow-request & loan lifecycle table.
   * Transitions: "pending" -> "approved" -> "returned" (or "pending" -> "declined").
   * A loan is overdue when `status === "approved"` and `endDate < Date.now()`.
   */
  loans: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.number(), // Epoch ms (UTC start of borrow window)
    endDate: v.number(), // Epoch ms (UTC due date)
    status: loanStatusValidator,
    notes: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    declinedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
    lastReminderSentAt: v.optional(v.number()),
    reminderCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status", ["status"])
    .index("by_status_and_end_date", ["status", "endDate"]),

  /**
   * Audit & activity log for n8n workflow dispatches and write-backs.
   * Enforces idempotency via `by_idempotency_key` so retries never duplicate reminders.
   * Powers the bonus "Recent automation activity" timeline on each loan card.
   */
  automationLogs: defineTable({
    loanId: v.id("loans"),
    workflow: automationWorkflowValidator,
    event: automationEventValidator,
    status: automationStatusValidator,
    recipientEmail: v.string(),
    summary: v.string(),
    idempotencyKey: v.string(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_loan", ["loanId"])
    .index("by_idempotency_key", ["idempotencyKey"]),
});


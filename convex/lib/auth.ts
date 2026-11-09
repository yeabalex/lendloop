import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Resolves the currently signed-in Convex user record from the verified Clerk JWT.
 * Returns `null` if unauthenticated or if the user record has not been synced yet.
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/**
 * Enforces that the caller is authenticated and has a synced user profile in Convex.
 * Throws a structured `ConvexError` if unauthenticated.
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in to perform this action.",
    });
  }
  return user;
}

/**
 * Enforces that the caller is authenticated AND holds the `"admin"` role.
 * Throws a structured `ConvexError` if unauthenticated or a standard `"user"`.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Admin privileges are required to perform this action.",
    });
  }
  return user;
}

/**
 * Enforces that the caller either owns the target resource OR holds the `"admin"` role.
 */
export function assertOwnerOrAdmin(
  user: Doc<"users">,
  ownerId: Id<"users">,
  resourceName = "listing"
): void {
  if (user.role !== "admin" && user._id !== ownerId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `You do not have permission to modify this ${resourceName}.`,
    });
  }
}


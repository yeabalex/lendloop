import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireAdmin, requireUser } from "./lib/auth";
import { userRoleValidator } from "./schema";

/**
 * Returns the currently signed-in user's profile (including `role` and `isTrustedLender`),
 * or `null` when signed out.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

/**
 * Synchronizes the authenticated Clerk user into Convex's `users` table.
 * - Identity fields (`subject`, `email`, `name`, `pictureUrl`) are read directly from
 *   the cryptographically verified Clerk JWT (`ctx.auth.getUserIdentity()`), never trusted from client args.
 * - Bootstraps the very first user in the database (or emails listed in `INITIAL_ADMIN_EMAILS`) as `"admin"`,
 *   and defaults all subsequent users to `"user"`.
 */
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Cannot sync user without a valid Clerk session.",
      });
    }

    const clerkId = identity.subject;
    const email = identity.email ?? "";
    const name =
      identity.name ??
      identity.nickname ??
      (email ? email.split("@")[0] : "Neighbor");
    const imageUrl = identity.pictureUrl;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      if (
        existing.email !== email ||
        existing.name !== name ||
        existing.imageUrl !== imageUrl
      ) {
        await ctx.db.patch(existing._id, {
          email,
          name,
          imageUrl,
        });
      }
      return existing._id;
    }

    // Determine initial role: first registered user in DB or configured admin email becomes "admin"
    const anyExistingUser = await ctx.db.query("users").first();
    const configuredAdmins = (process.env.INITIAL_ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isBootstrapAdmin =
      anyExistingUser === null ||
      (email !== "" && configuredAdmins.includes(email.toLowerCase()));

    return await ctx.db.insert("users", {
      clerkId,
      email,
      name,
      imageUrl,
      role: isBootstrapAdmin ? "admin" : "user",
      isTrustedLender: isBootstrapAdmin,
      createdAt: Date.now(),
    });
  },
});

/**
 * Admin-only: Lists all registered users so admins can manage "Trusted Lender" badges and roles.
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").order("desc").collect();
  },
});

/**
 * Admin-only: Marks or unmarks a lender as a "Trusted Lender" (Requirement: Admin Roles & Rules).
 */
export const setTrustedLender = mutation({
  args: {
    userId: v.id("users"),
    isTrustedLender: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Target user not found.",
      });
    }

    await ctx.db.patch(args.userId, {
      isTrustedLender: args.isTrustedLender,
    });

    return { userId: args.userId, isTrustedLender: args.isTrustedLender };
  },
});

/**
 * Admin-only: Updates a user's role ("admin" | "user"), preventing removal of the last admin.
 */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: userRoleValidator,
  },
  handler: async (ctx, args) => {
    const caller = await requireAdmin(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Target user not found.",
      });
    }

    if (target.role === "admin" && args.role === "user") {
      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();

      if (admins.length <= 1 && caller._id === target._id) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Cannot demote the only remaining admin account.",
        });
      }
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
    });

    return { userId: args.userId, role: args.role };
  },
});


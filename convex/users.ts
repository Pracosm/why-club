import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getCurrentUser,
  requireAnyRole,
  requireRole,
  requireUser,
} from "./lib/auth";
import { appError } from "./lib/errors";
import { roleValidator, shippingAddressValidator } from "./lib/validators";

const staffRoles = ["super_admin", "admin", "editor"] as const;

function isStaffRole(role: string): role is (typeof staffRoles)[number] {
  return staffRoles.includes(role as (typeof staffRoles)[number]);
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const listCustomers = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "customer"))
      .collect();
  },
});

export const listTeam = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "super_admin");
    const users = await ctx.db.query("users").collect();
    return users
      .filter((user) => isStaffRole(user.role))
      .sort((left, right) => left.role.localeCompare(right.role));
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, "super_admin");
    const user = await ctx.db.get("users", args.userId);

    if (!user) {
      throw appError("NOT_FOUND", "User not found.");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return {
      updatedBy: actor._id,
      userId: args.userId,
      role: args.role,
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const name = args.name.trim();

    if (name.length < 2) {
      throw appError("INVALID_INPUT", "Name must be at least 2 characters.");
    }

    if (name.length > 80) {
      throw appError("INVALID_INPUT", "Name must be 80 characters or fewer.");
    }

    await ctx.db.patch(user._id, {
      name,
      updatedAt: Date.now(),
    });

    return {
      ok: true,
    };
  },
});

export const updateShippingAddress = mutation({
  args: {
    shippingAddress: shippingAddressValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      shippingAddress: args.shippingAddress,
      updatedAt: Date.now(),
    });

    return {
      ok: true,
    };
  },
});

export const bootstrapSession = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const identity = await ctx.auth.getUserIdentity();

    await ctx.db.patch(user._id, {
      tokenIdentifier: identity?.tokenIdentifier,
      lastSeenAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get("users", user._id);
  },
});

export const getByIdInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get("users", args.userId);
  },
});

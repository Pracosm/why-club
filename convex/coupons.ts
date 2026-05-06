import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAnyRole } from "./lib/auth";
import { appError } from "./lib/errors";
import {
  isCouponUsableAtCapture,
  normalizeCouponCode,
  validateCouponInput,
} from "./lib/couponRules";
import { computeDiscount } from "./lib/orderPricing";
import { discountTypeValidator } from "./lib/validators";

function isCouponUsable(coupon: {
  isActive: boolean;
  expiresAt?: number;
  usageLimit?: number;
  usedCount: number;
}) {
  if (!coupon.isActive) {
    return false;
  }

  return isCouponUsableAtCapture(coupon, Date.now());
}

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    return await ctx.db.query("coupons").collect();
  },
});

export const listAllPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    if (args.isActive !== undefined) {
      return await ctx.db
        .query("coupons")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive ?? false))
        .paginate(args.paginationOpts);
    }

    return await ctx.db.query("coupons").paginate(args.paginationOpts);
  },
});

export const validateCode = query({
  args: {
    code: v.string(),
    subtotal: v.number(),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", normalizeCouponCode(args.code)))
      .unique();

    if (!coupon || !isCouponUsable(coupon)) {
      return {
        valid: false,
        discountAmount: 0,
      };
    }

    if (args.subtotal < coupon.minOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
      };
    }

    return {
      valid: true,
      couponId: coupon._id,
      discountAmount: computeDiscount(coupon, args.subtotal),
      couponCode: coupon.code,
    };
  },
});

export const previewForAdmin = query({
  args: {
    code: v.string(),
    subtotal: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const code = normalizeCouponCode(args.code);
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!coupon) {
      return {
        ok: false,
        code,
        discountAmount: 0,
        finalTotal: Math.max(0, args.subtotal),
        message: "Coupon code does not exist.",
      };
    }

    if (!isCouponUsable(coupon)) {
      return {
        ok: false,
        code,
        discountAmount: 0,
        finalTotal: Math.max(0, args.subtotal),
        message: "Coupon is inactive, expired, or over its usage limit.",
      };
    }

    if (args.subtotal < coupon.minOrderValue) {
      return {
        ok: false,
        code,
        discountAmount: 0,
        finalTotal: Math.max(0, args.subtotal),
        message: `Minimum order value is ₹${coupon.minOrderValue}.`,
      };
    }

    const discountAmount = computeDiscount(coupon, args.subtotal);
    return {
      ok: true,
      code,
      discountAmount,
      finalTotal: Math.max(0, args.subtotal - discountAmount),
      message: `${coupon.code} applies ${discountAmount > 0 ? `₹${discountAmount}` : "no"} discount.`,
    };
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    title: v.optional(v.string()),
    discountType: discountTypeValidator,
    discountValue: v.number(),
    minOrderValue: v.number(),
    usageLimit: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const validationError = validateCouponInput(args);
    if (validationError) {
      throw appError("INVALID_INPUT", validationError);
    }

    const code = normalizeCouponCode(args.code);
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (existing) {
      throw appError("CONFLICT", "Coupon code already exists.");
    }

    const now = Date.now();
    return await ctx.db.insert("coupons", {
      ...args,
      code,
      usedCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    couponId: v.id("coupons"),
    title: v.optional(v.string()),
    discountType: discountTypeValidator,
    discountValue: v.number(),
    minOrderValue: v.number(),
    usageLimit: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const coupon = await ctx.db.get("coupons", args.couponId);
    if (!coupon) {
      throw appError("NOT_FOUND", "Coupon not found.");
    }

    const validationError = validateCouponInput(args);
    if (validationError) {
      throw appError("INVALID_INPUT", validationError);
    }

    await ctx.db.patch(args.couponId, {
      title: args.title,
      discountType: args.discountType,
      discountValue: args.discountValue,
      minOrderValue: args.minOrderValue,
      usageLimit: args.usageLimit,
      expiresAt: args.expiresAt,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return await ctx.db.get("coupons", args.couponId);
  },
});

export const incrementUsage = mutation({
  args: {
    couponId: v.id("coupons"),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get("coupons", args.couponId);
    if (!coupon) {
      throw appError("NOT_FOUND", "Coupon not found.");
    }

    await ctx.db.patch(args.couponId, {
      usedCount: coupon.usedCount + 1,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

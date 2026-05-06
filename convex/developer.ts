import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAnyRole } from "./lib/auth";

const EMAIL_OTP_FLAG = "auth.emailOtpEnabled";

function isEnvSet(name: string) {
  if (typeof process === "undefined") {
    return false;
  }

  return Boolean(process.env[name]?.trim());
}

async function getEmailOtpFlag(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("developerFeatureFlags")
    .withIndex("by_key", (q) => q.eq("key", EMAIL_OTP_FLAG))
    .unique();
}

export const getAuthFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    const flag = await getEmailOtpFlag(ctx);

    return {
      emailOtpEnabled: flag?.enabled ?? false,
    };
  },
});

export const getDeveloperAuthSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin"]);
    const flag = await getEmailOtpFlag(ctx);

    return {
      emailOtpEnabled: flag?.enabled ?? false,
      configHealth: {
        resendApiKey: isEnvSet("RESEND_API_KEY"),
        resendFromEmail: isEnvSet("RESEND_FROM_EMAIL"),
        otpHashPepper: isEnvSet("OTP_HASH_PEPPER"),
      },
      updatedAt: flag?.updatedAt,
    };
  },
});

export const setEmailOtpEnabled = mutation({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireAnyRole(ctx, ["super_admin"]);
    const existing = await getEmailOtpFlag(ctx);
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedBy: actor._id,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const flagId = await ctx.db.insert("developerFeatureFlags", {
      key: EMAIL_OTP_FLAG,
      enabled: args.enabled,
      updatedBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(flagId);
  },
});

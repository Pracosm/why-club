import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAnyRole } from "./lib/auth";

export const generateProductImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getProductImageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

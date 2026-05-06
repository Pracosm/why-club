import { paginationOptsValidator } from "convex/server";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAnyRole } from "./lib/auth";
import { appError } from "./lib/errors";
import type { Id } from "./_generated/dataModel";

async function ensureUniqueSlug(
  ctx: MutationCtx,
  slug: string,
  currentId?: Id<"collections">,
) {
  const existing = await ctx.db
    .query("collections")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== currentId) {
    throw appError("CONFLICT", "A collection with this slug already exists.");
  }
}

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("collections")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    return await ctx.db.query("collections").collect();
  },
});

export const listAllPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    if (args.isActive !== undefined) {
      return await ctx.db
        .query("collections")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive ?? false))
        .paginate(args.paginationOpts);
    }

    return await ctx.db.query("collections").paginate(args.paginationOpts);
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("collections")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    await ensureUniqueSlug(ctx, args.slug);
    const now = Date.now();

    return await ctx.db.insert("collections", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    collectionId: v.id("collections"),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    const collection = await ctx.db.get("collections", args.collectionId);
    if (!collection) {
      throw appError("NOT_FOUND", "Collection not found.");
    }

    await ensureUniqueSlug(ctx, args.slug, args.collectionId);

    await ctx.db.patch(args.collectionId, {
      title: args.title,
      slug: args.slug,
      description: args.description,
      imageUrl: args.imageUrl,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return await ctx.db.get("collections", args.collectionId);
  },
});

export const remove = mutation({
  args: {
    collectionId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const collection = await ctx.db.get("collections", args.collectionId);
    if (!collection) {
      throw appError("NOT_FOUND", "Collection not found.");
    }

    const attachedProducts = await ctx.db
      .query("products")
      .withIndex("by_collection", (q) => q.eq("collectionId", args.collectionId))
      .take(1);

    if (attachedProducts.length > 0) {
      throw appError(
        "CONFLICT",
        "Remove or reassign products before deleting this collection.",
      );
    }

    await ctx.db.delete("collections", args.collectionId);
    return { ok: true };
  },
});

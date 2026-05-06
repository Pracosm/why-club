import { paginationOptsValidator } from "convex/server";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAnyRole } from "./lib/auth";
import { appError } from "./lib/errors";
import { validateProductInput } from "./lib/productRules";
import { productBadgeValidator } from "./lib/validators";
import type { Id } from "./_generated/dataModel";

async function ensureUniqueSlug(
  ctx: MutationCtx,
  slug: string,
  currentId?: Id<"products">,
) {
  const existing = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== currentId) {
    throw appError("CONFLICT", "A product with this slug already exists.");
  }
}

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    return await ctx.db.query("products").collect();
  },
});

export const listAllPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    if (args.isPublished !== undefined) {
      return await ctx.db
        .query("products")
        .withIndex("by_published", (q) =>
          q.eq("isPublished", args.isPublished ?? false),
        )
        .paginate(args.paginationOpts);
    }

    return await ctx.db.query("products").paginate(args.paginationOpts);
  },
});

export const listByCollectionSlug = query({
  args: {
    collectionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db
      .query("collections")
      .withIndex("by_slug", (q) => q.eq("slug", args.collectionSlug))
      .unique();

    if (!collection) {
      return [];
    }

    const products = await ctx.db
      .query("products")
      .withIndex("by_collection", (q) => q.eq("collectionId", collection._id))
      .collect();

    return products.filter((product) => product.isPublished);
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getMany = query({
  args: {
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.productIds.map((productId) => ctx.db.get("products", productId)),
    );
  },
});

export const getManyBySlugs = query({
  args: {
    slugs: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const seen = new Set<string>();
    const products = [];

    for (const slug of args.slugs) {
      if (seen.has(slug)) {
        continue;
      }

      seen.add(slug);
      const product = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();

      if (product) {
        products.push(product);
      }
    }

    return products;
  },
});

export const create = mutation({
  args: {
    collectionId: v.optional(v.id("collections")),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    mrp: v.number(),
    sellingPrice: v.number(),
    inventoryCount: v.number(),
    images: v.array(v.string()),
    hsnCode: v.optional(v.string()),
    isPublished: v.boolean(),
    badge: v.optional(productBadgeValidator),
    tags: v.array(v.string()),
    sizes: v.array(v.string()),
    soldOutSizes: v.array(v.string()),
    fit: v.optional(v.string()),
    material: v.optional(v.string()),
    weightGsm: v.optional(v.number()),
    story: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    const validationError = validateProductInput(args);
    if (validationError) {
      throw appError("INVALID_INPUT", validationError);
    }

    await ensureUniqueSlug(ctx, args.slug);
    const now = Date.now();

    return await ctx.db.insert("products", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    productId: v.id("products"),
    collectionId: v.optional(v.id("collections")),
    title: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    mrp: v.number(),
    sellingPrice: v.number(),
    inventoryCount: v.number(),
    images: v.array(v.string()),
    hsnCode: v.optional(v.string()),
    isPublished: v.boolean(),
    badge: v.optional(productBadgeValidator),
    tags: v.array(v.string()),
    sizes: v.array(v.string()),
    soldOutSizes: v.array(v.string()),
    fit: v.optional(v.string()),
    material: v.optional(v.string()),
    weightGsm: v.optional(v.number()),
    story: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin", "editor"]);
    const product = await ctx.db.get("products", args.productId);
    if (!product) {
      throw appError("NOT_FOUND", "Product not found.");
    }

    const validationError = validateProductInput(args);
    if (validationError) {
      throw appError("INVALID_INPUT", validationError);
    }

    await ensureUniqueSlug(ctx, args.slug, args.productId);

    await ctx.db.patch(args.productId, {
      collectionId: args.collectionId,
      title: args.title,
      slug: args.slug,
      description: args.description,
      mrp: args.mrp,
      sellingPrice: args.sellingPrice,
      inventoryCount: args.inventoryCount,
      images: args.images,
      hsnCode: args.hsnCode,
      isPublished: args.isPublished,
      badge: args.badge,
      tags: args.tags,
      sizes: args.sizes,
      soldOutSizes: args.soldOutSizes,
      fit: args.fit,
      material: args.material,
      weightGsm: args.weightGsm,
      story: args.story,
      updatedAt: Date.now(),
    });

    return await ctx.db.get("products", args.productId);
  },
});

export const remove = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    await requireAnyRole(ctx, ["super_admin", "admin"]);
    const product = await ctx.db.get("products", args.productId);
    if (!product) {
      throw appError("NOT_FOUND", "Product not found.");
    }

    const orders = await ctx.db.query("orders").collect();
    const isAttachedToOrder = orders.some((order) =>
      order.items.some((item) => item.productId === args.productId),
    );

    if (isAttachedToOrder) {
      throw appError(
        "CONFLICT",
        "Product is attached to existing orders. Unpublish it instead of deleting it.",
      );
    }

    await ctx.db.delete("products", args.productId);
    return { ok: true };
  },
});

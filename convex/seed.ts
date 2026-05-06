import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  collectionSeedValidator,
  productSeedValidator,
  reviewSeedValidator,
} from "./lib/validators";
import { getSuperAdminEmails, isProdDeployment, readOptionalEnv } from "./lib/env";

function canSeed(seedToken: string | undefined) {
  const expected = readOptionalEnv("SEED_DEMO_TOKEN");

  if (!expected) {
    return !isProdDeployment();
  }

  return seedToken === expected;
}

export const demo = action({
  args: {
    seedToken: v.optional(v.string()),
    collections: v.array(collectionSeedValidator),
    products: v.array(productSeedValidator),
    reviews: v.array(reviewSeedValidator),
  },
  handler: async (ctx, args): Promise<unknown> => {
    if (!canSeed(args.seedToken)) {
      throw new Error("Demo seed is disabled for this deployment.");
    }

    return await ctx.runMutation(internal.seed.applyDemoSeed, args);
  },
});

export const applyDemoSeed = internalMutation({
  args: {
    seedToken: v.optional(v.string()),
    collections: v.array(collectionSeedValidator),
    products: v.array(productSeedValidator),
    reviews: v.array(reviewSeedValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const collectionIds = new Map<string, Id<"collections">>();
    const productIds = new Map<string, Id<"products">>();
    const superAdminEmail = [...getSuperAdminEmails()][0] ?? "founder@whyclub.in";

    const upsertUserByEmail = async (email: string, role: "super_admin" | "customer") => {
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          role,
          updatedAt: now,
        });
        return existing._id;
      }

      return await ctx.db.insert("users", {
        email,
        name: email.split("@")[0],
        role,
        createdAt: now,
        updatedAt: now,
      });
    };

    const founderId = await upsertUserByEmail(superAdminEmail, "super_admin");
    const customerOneId = await upsertUserByEmail("aisha@whyclub.in", "customer");
    const customerTwoId = await upsertUserByEmail("kabir@whyclub.in", "customer");

    for (const collection of args.collections) {
      const existing = await ctx.db
        .query("collections")
        .withIndex("by_slug", (q) => q.eq("slug", collection.slug))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          title: collection.title,
          description: collection.description,
          imageUrl: collection.imageUrl,
          isActive: collection.isActive,
          updatedAt: now,
        });
        collectionIds.set(collection.slug, existing._id);
        continue;
      }

      const collectionId = await ctx.db.insert("collections", {
        ...collection,
        createdAt: now,
        updatedAt: now,
      });
      collectionIds.set(collection.slug, collectionId);
    }

    for (const product of args.products) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", product.slug))
        .unique();

      const payload = {
        collectionId: collectionIds.get(product.collectionSlug),
        title: product.title,
        slug: product.slug,
        description: product.description,
        mrp: product.mrp,
        sellingPrice: product.sellingPrice,
        inventoryCount: product.inventoryCount,
        images: product.images,
        hsnCode: product.hsnCode,
        isPublished: product.isPublished,
        badge: product.badge,
        tags: product.tags,
        sizes: product.sizes,
        soldOutSizes: product.soldOutSizes,
        fit: product.fit,
        material: product.material,
        weightGsm: product.weightGsm,
        story: product.story,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
        productIds.set(product.slug, existing._id);
        continue;
      }

      const productId = await ctx.db.insert("products", {
        ...payload,
        createdAt: now,
      });
      productIds.set(product.slug, productId);
    }

    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", "DROP01"))
      .unique();

    if (coupon) {
      await ctx.db.patch(coupon._id, {
        title: "Drop 01 launch",
        discountType: "percentage",
        discountValue: 10,
        minOrderValue: 1500,
        usageLimit: 100,
        isActive: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("coupons", {
        code: "DROP01",
        title: "Drop 01 launch",
        discountType: "percentage",
        discountValue: 10,
        minOrderValue: 1500,
        usageLimit: 100,
        usedCount: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const [index, review] of args.reviews.entries()) {
      const productId = productIds.get(review.productSlug);
      if (!productId) {
        continue;
      }

      const userId = index % 2 === 0 ? customerOneId : customerTwoId;
      const existing = (
        await ctx.db
        .query("reviews")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect()
      ).find((reviewDoc) => reviewDoc.userId === userId);

      const payload = {
        productId,
        userId,
        authorName: review.author,
        rating: review.rating,
        comment: review.comment,
        location: review.location,
        isApproved: true,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("reviews", {
          ...payload,
          createdAt: now,
        });
      }
    }

    const leadProductId = productIds.get(args.products[0]?.slug ?? "");
    if (leadProductId) {
      const existingOrder = await ctx.db
        .query("orders")
        .withIndex("by_user", (q) => q.eq("userId", customerOneId))
        .first();

      if (!existingOrder) {
        await ctx.db.insert("orders", {
          userId: customerOneId,
          totalAmount: args.products[0].sellingPrice,
          discountAmount: 0,
          currency: "INR",
          couponCode: undefined,
          couponId: undefined,
          status: "delivered",
          paymentStatus: "captured",
          shippingAddress: {
            fullName: "Aisha Khan",
            line1: "14 Residency Road",
            city: "Bengaluru",
            state: "Karnataka",
            postalCode: "560025",
            country: "India",
            phoneNumber: "+919800000000",
          },
          items: [
            {
              productId: leadProductId,
              productSlug: args.products[0].slug,
              productTitle: args.products[0].title,
              quantity: 1,
              size: "M",
              unitPrice: args.products[0].sellingPrice,
              lineTotal: args.products[0].sellingPrice,
            },
          ],
          razorpayOrderId: "demo_seed_order",
          razorpayPaymentId: "demo_seed_payment",
          createdAt: now,
          updatedAt: now,
          paidAt: now,
        });
      }
    }

    return {
      founderId,
      collections: collectionIds.size,
      products: productIds.size,
      reviews: args.reviews.length,
    };
  },
});

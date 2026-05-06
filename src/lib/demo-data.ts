import type {
  DemoCollection,
  DemoFaq,
  DemoPolicyItem,
  DemoProduct,
  DemoReview,
} from "@/lib/types";

export const siteCopy = {
  name: "WhÿClub",
  slogan: "perfect is boring",
  manifesto:
    "Bold graphics. Oversized fits. Every piece starts with a feeling, not a brief.",
  heroEyebrow: "drop 01",
  heroTitle: "Streetwear for the ones who get it.",
  heroBody:
    "WhÿClub builds oversized graphic tees for Indian youth culture with a sharper point of view than template-first fashion.",
  footerBlurb:
    "Bold graphics. Oversized fits. Perfect is boring. India.",
  originCity: "Mumbai",
  foundedYear: 2024,
  supportEmail: "hello@whyclub.in",
  instagramHandle: "@whyclub.in",
  whatsappUrl: "https://wa.me/919999999999",
};

export const demoCollections: DemoCollection[] = [
  {
    slug: "drop-01",
    title: "Drop 01",
    description:
      "The first WhÿClub drop, anchored in feelings over briefs and oversized silhouettes built for after-hours city energy.",
    imageUrl: "/images/tee-midnight.webp",
    isActive: true,
  },
];

export const demoProducts: DemoProduct[] = [
  {
    slug: "midnight-in-mumbai",
    collectionSlug: "drop-01",
    title: "Midnight in Mumbai",
    description:
      "An oversized heavyweight tee built for those who thrive after midnight. Stonewashed black with a worn-in feel that only gets better.",
    mrp: 1999,
    sellingPrice: 1999,
    inventoryCount: 18,
    images: ["/images/tee-midnight.webp"],
    hsnCode: "61091000",
    isPublished: true,
    badge: "new",
    tags: ["oversized", "graphic tee", "heavyweight", "made in india"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    soldOutSizes: [],
    fit: "oversized",
    material: "100% cotton",
    weightGsm: 280,
    story:
      "A tee for late-night drives, sea-link lights, and the kind of city confidence that only shows up after midnight.",
  },
  {
    slug: "bad-touch",
    collectionSlug: "drop-01",
    title: "Bad Touch",
    description:
      "An off-white drop-shoulder heavyweight tee with a thermal hand print that feels more statement than slogan.",
    mrp: 1799,
    sellingPrice: 1799,
    inventoryCount: 10,
    images: ["/images/tee-badtouch.webp"],
    hsnCode: "61091000",
    isPublished: true,
    badge: "new",
    tags: ["oversized", "graphic tee", "heavyweight", "made in india"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    soldOutSizes: ["XXL"],
    fit: "oversized",
    material: "100% cotton",
    weightGsm: 260,
    story:
      "A rawer graphic for the moments that don't need footnotes. Clean base, sharper intent, built to wear loud without trying too hard.",
  },
  {
    slug: "please-im-a-star",
    collectionSlug: "drop-01",
    title: "Please I'm a Star",
    description:
      "A cream oversized base with a star-burst graphic. A reminder that everyone who needs to know already knows.",
    mrp: 1999,
    sellingPrice: 1699,
    inventoryCount: 8,
    images: ["/images/tee-star-new.webp"],
    hsnCode: "61091000",
    isPublished: true,
    badge: "sale",
    tags: ["oversized", "graphic tee", "heavyweight", "made in india"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    soldOutSizes: ["XL", "XXL"],
    fit: "oversized",
    material: "100% cotton",
    weightGsm: 260,
    story:
      "Cream base, star-burst attitude, and just enough irreverence to make the point before you even say a word.",
  },
  {
    slug: "star-gaze",
    collectionSlug: "drop-01",
    title: "Star Gaze",
    description:
      "A black oversized tee with stripped-back star energy for the days when the fit needs to stay sharper than the room.",
    mrp: 1699,
    sellingPrice: 1699,
    inventoryCount: 12,
    images: ["/images/tee-star-new.webp"],
    hsnCode: "61091000",
    isPublished: true,
    badge: "new",
    tags: ["oversized", "graphic tee", "black", "made in india"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    soldOutSizes: [],
    fit: "oversized",
    material: "100% cotton",
    weightGsm: 260,
    story:
      "Minimal color, maximum attitude. Built for clean black fits, late entries, and one-line compliments.",
  },
];

export const demoReviews: DemoReview[] = [
  {
    productSlug: "midnight-in-mumbai",
    author: "Aarav",
    rating: 5,
    comment:
      "This tee goes crazy at night. The graphic pops under streetlights.",
    location: "Mumbai",
  },
  {
    productSlug: "please-im-a-star",
    author: "Riya",
    rating: 5,
    comment:
      "Got the yellow star tee and honestly it slaps. Perfect is boring is in the fabric.",
    location: "Bengaluru",
  },
  {
    productSlug: "bad-touch",
    author: "Kabir",
    rating: 5,
    comment: "The fit is exactly the right oversized. Heavy without feeling stiff.",
    location: "Delhi",
  },
];

export const returnsPolicy: DemoPolicyItem[] = [
  {
    title: "Returns window",
    body: "Returns are accepted within 7 days from the date of delivery.",
  },
  {
    title: "Eligibility",
    body:
      "Items must be unworn, unwashed, with tags intact and in original packaging. Sale items, altered items, or late requests are not eligible.",
  },
  {
    title: "Refund timing",
    body:
      "Prepaid orders are refunded to the original payment method in 3 to 5 business days. COD refunds are processed by bank transfer.",
  },
  {
    title: "Damaged items",
    body:
      "Report damaged or defective items within 48 hours with photos. Replacement is attempted first, otherwise a refund is processed.",
  },
];

export const contactFaqs: DemoFaq[] = [
  {
    question: "How long does shipping take?",
    answer:
      "Metro orders usually arrive in 3 to 5 business days. The rest of India usually lands in 5 to 7 business days.",
  },
  {
    question: "Do you offer COD?",
    answer: "COD is available across India. Shipping is free on prepaid orders.",
  },
  {
    question: "How do the tees fit?",
    answer:
      "All tees are oversized. Your usual size gives the intended drape, so size up only if you want it extra loose.",
  },
];

export function getCollectionBySlug(slug: string) {
  return demoCollections.find((collection) => collection.slug === slug) ?? null;
}

export function getProductBySlug(slug: string) {
  return demoProducts.find((product) => product.slug === slug) ?? null;
}

export function getProductsByCollection(collectionSlug: string) {
  return demoProducts.filter((product) => product.collectionSlug === collectionSlug);
}

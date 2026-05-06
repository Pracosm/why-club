import {
  isProductionDeployment,
  readOptionalEnv,
  readRequiredEnv,
  requireEnvInProduction,
} from "./env";

const API_BASE = "https://api.razorpay.com/v1";
const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return toHex(signature);
}

function getLiveConfig() {
  const keyId = requireEnvInProduction("PUBLIC_RAZORPAY_KEY_ID");
  const keySecret = requireEnvInProduction("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    return null;
  }
  return { keyId, keySecret };
}

export type MagicLineItem = {
  sku: string;
  variantId?: string;
  price: number;
  offerPrice?: number;
  quantity: number;
  name: string;
  description?: string;
  imageUrl?: string;
  productUrl?: string;
  weight?: number;
};

type RazorpayMagicAddress = {
  city?: string;
  contact?: string;
  country?: string;
  line1?: string;
  line2?: string;
  name?: string;
  state?: string;
  zipcode?: string;
};

type RazorpayMagicOrderDetails = {
  customerDetails?: {
    contact?: string;
    email?: string;
    shippingAddress?: RazorpayMagicAddress;
  };
};

export type RazorpayOrderPayment = {
  id: string;
  status?: string;
  captured?: boolean;
  amount?: number;
  errorDescription?: string;
};

function toPaise(amount: number) {
  return Math.round(amount * 100);
}

function base64Encode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let encoded = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index] ?? 0;
    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;
    const triplet = (byte1 << 16) | (byte2 << 8) | byte3;

    encoded += BASE64_ALPHABET[(triplet >> 18) & 0x3f];
    encoded += BASE64_ALPHABET[(triplet >> 12) & 0x3f];
    encoded +=
      index + 1 < bytes.length
        ? BASE64_ALPHABET[(triplet >> 6) & 0x3f]
        : "=";
    encoded +=
      index + 2 < bytes.length ? BASE64_ALPHABET[triplet & 0x3f] : "=";
  }

  return encoded;
}

function getAuthHeader(config: { keyId: string; keySecret: string }) {
  return `Basic ${base64Encode(`${config.keyId}:${config.keySecret}`)}`;
}

async function getRazorpayErrorDetail(response: Response) {
  const detail = (await response.text().catch(() => "")).trim();
  return detail ? ` ${detail.slice(0, 500)}` : "";
}

function buildMagicLineItems(lineItems: MagicLineItem[]) {
  return lineItems.map((item) => ({
    sku: item.sku,
    variant_id: item.variantId ?? item.sku,
    price: toPaise(item.price),
    offer_price: toPaise(item.offerPrice ?? item.price),
    quantity: item.quantity,
    name: item.name,
    description: item.description ?? item.name,
    ...(item.imageUrl !== undefined ? { image_url: item.imageUrl } : {}),
    ...(item.productUrl !== undefined ? { product_url: item.productUrl } : {}),
    ...(item.weight !== undefined ? { weight: item.weight } : {}),
  }));
}

export function getCheckoutMode() {
  return getLiveConfig() ? "live" : "demo";
}

export async function createRazorpayOrder(args: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const liveConfig = getLiveConfig();
  if (!liveConfig) {
    return {
      mode: "demo" as const,
      keyId: "demo_key_id",
      razorpayOrderId: `demo_order_${crypto.randomUUID()}`,
      amount: args.amount,
      currency: args.currency,
      receipt: args.receipt,
    };
  }

  const response = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(liveConfig),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: toPaise(args.amount),
      currency: args.currency,
      receipt: args.receipt,
      notes: args.notes,
    }),
  });

  if (!response.ok) {
    const detail = await getRazorpayErrorDetail(response);
    throw new Error(
      `Razorpay order creation failed: ${response.status} ${response.statusText}${detail}`,
    );
  }

  const json = (await response.json()) as { id: string };
  return {
    mode: "live" as const,
    keyId: liveConfig.keyId,
    razorpayOrderId: json.id,
    amount: args.amount,
    currency: args.currency,
    receipt: args.receipt,
  };
}

export async function createRazorpayMagicOrder(args: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
  lineItems: MagicLineItem[];
  lineItemsTotal?: number;
}) {
  const lineItems = buildMagicLineItems(args.lineItems);
  const lineItemsTotal =
    args.lineItemsTotal !== undefined
      ? toPaise(args.lineItemsTotal)
      : toPaise(args.amount);

  const liveConfig = getLiveConfig();
  if (!liveConfig) {
    return {
      mode: "demo" as const,
      keyId: "demo_key_id",
      razorpayOrderId: `demo_order_${crypto.randomUUID()}`,
      amount: args.amount,
      currency: args.currency,
      receipt: args.receipt,
      lineItemsTotal,
      lineItems,
    };
  }

  const response = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(liveConfig),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: toPaise(args.amount),
      currency: args.currency,
      receipt: args.receipt,
      notes: args.notes,
      line_items_total: lineItemsTotal,
      line_items: lineItems,
    }),
  });

  if (!response.ok) {
    const detail = await getRazorpayErrorDetail(response);
    throw new Error(
      `Razorpay Magic order creation failed: ${response.status} ${response.statusText}${detail}`,
    );
  }

  const json = (await response.json()) as {
    id: string;
    line_items_total?: number;
  };
  return {
    mode: "live" as const,
    keyId: liveConfig.keyId,
    razorpayOrderId: json.id,
    amount: args.amount,
    currency: args.currency,
    receipt: args.receipt,
    lineItemsTotal: json.line_items_total ?? lineItemsTotal,
    lineItems,
  };
}

export async function fetchRazorpayOrderDetails(
  razorpayOrderId: string,
): Promise<RazorpayMagicOrderDetails> {
  const liveConfig = getLiveConfig();
  if (!liveConfig || razorpayOrderId.startsWith("demo_order_")) {
    return {};
  }

  const response = await fetch(`${API_BASE}/orders/${razorpayOrderId}`, {
    headers: {
      Authorization: getAuthHeader(liveConfig),
    },
  });

  if (!response.ok) {
    const detail = await getRazorpayErrorDetail(response);
    throw new Error(
      `Razorpay order fetch failed: ${response.status} ${response.statusText}${detail}`,
    );
  }

  const json = (await response.json()) as {
    customer_details?: {
      contact?: string;
      email?: string;
      shipping_address?: RazorpayMagicAddress;
    };
  };

  return {
    customerDetails: {
      contact: json.customer_details?.contact,
      email: json.customer_details?.email,
      shippingAddress: json.customer_details?.shipping_address,
    },
  };
}

export async function fetchRazorpayOrderPayments(
  razorpayOrderId: string,
): Promise<RazorpayOrderPayment[]> {
  const liveConfig = getLiveConfig();
  if (!liveConfig || razorpayOrderId.startsWith("demo_order_")) {
    return [];
  }

  const response = await fetch(`${API_BASE}/orders/${razorpayOrderId}/payments`, {
    headers: {
      Authorization: getAuthHeader(liveConfig),
    },
  });

  if (!response.ok) {
    const detail = await getRazorpayErrorDetail(response);
    throw new Error(
      `Razorpay order payments fetch failed: ${response.status} ${response.statusText}${detail}`,
    );
  }

  const json = (await response.json()) as {
    items?: Array<{
      id?: string;
      status?: string;
      captured?: boolean;
      amount?: number;
      error_description?: string;
    }>;
  };

  return (json.items ?? [])
    .filter((payment) => typeof payment.id === "string")
    .map((payment) => ({
      id: payment.id as string,
      status: payment.status,
      captured: payment.captured,
      amount: payment.amount,
      errorDescription: payment.error_description,
    }));
}

export async function verifyCheckoutSignature(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const liveConfig = getLiveConfig();
  if (!liveConfig) {
    return true;
  }

  const expected = await hmacSha256Hex(
    liveConfig.keySecret,
    `${args.razorpayOrderId}|${args.razorpayPaymentId}`,
  );
  return expected === args.razorpaySignature;
}

export async function verifyWebhookSignature(args: {
  rawBody: string;
  signature: string | null;
}) {
  const secret = readOptionalEnv("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) {
    if (isProductionDeployment()) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET is required in production.");
    }

    return {
      verified: false,
      skipped: true,
      reason: "RAZORPAY_WEBHOOK_SECRET is not configured.",
    };
  }

  if (!args.signature) {
    return {
      verified: false,
      skipped: false,
      reason: "Missing Razorpay webhook signature header.",
    };
  }

  const signature = args.signature;
  const expected = await hmacSha256Hex(secret, args.rawBody);
  const verified =
    expected.length === signature.length &&
    [...expected].reduce(
      (matches, char, index) => matches && char === signature[index],
      true,
    );

  return {
    verified,
    skipped: false,
  };
}

export function requireRazorpaySiteUrl() {
  return readRequiredEnv("CONVEX_SITE_URL");
}

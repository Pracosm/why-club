import type { Dispatch, SetStateAction } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export type DisplayItem = {
  productSlug: string;
  productTitle: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  size: string;
  material: string;
  weightGsm: number;
};

export type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayOptions = {
  key: string;
  name: string;
  description: string;
  order_id: string;
  amount: number;
  currency: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  one_click_checkout?: boolean;
};

export type MagicCheckoutResult = {
  mode?: "demo" | "live" | "existing";
  orderId: Id<"orders">;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  receipt?: string;
  guestAccessToken?: string;
};

export type CheckoutTotalsPreview = {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  couponCode?: string;
  couponStatus: {
    ok: boolean;
    code?: string;
    message?: string;
  };
  items: Array<{
    productId: Id<"products">;
    productSlug: string;
    productTitle: string;
    quantity: number;
    size?: string;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export type VerifyPaymentResult = {
  ok: boolean;
  paymentResult?: unknown;
};

export type CartStateSetter<T> = Dispatch<SetStateAction<T>>;

export type CheckoutItemInput = {
  productId: Id<"products">;
  quantity: number;
  size?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

import type { CartItem } from "@/lib/cart";
import { publicEnv } from "@/lib/env";
import type { ShippingFormState } from "./shippingForm";
import { loadGuestAccessToken, saveGuestAccessToken } from "./guestAccessToken";
import {
  toShippingAddress,
  validateShippingForm,
} from "./shippingForm";
import type {
  CheckoutItemInput,
  MagicCheckoutResult,
  VerifyPaymentResult,
} from "./types";

type LiveProduct = {
  _id: CheckoutItemInput["productId"];
  slug: string;
};

type CheckoutAction<TArgs, TResult> = (args: TArgs) => Promise<TResult>;

type UseCheckoutPaymentArgs = {
  cartItems: CartItem[];
  liveProducts: LiveProduct[] | undefined;
  subtotal: number;
  shipping: ShippingFormState;
  couponCode: string;
  isAuthenticated: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  setCartItems: (items: CartItem[]) => void;
  setStatusMessage: (message: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  createMagicCheckout: CheckoutAction<
    {
      items: CheckoutItemInput[];
      couponCode?: string;
    },
    MagicCheckoutResult
  >;
  createStandardCheckout: CheckoutAction<
    {
      items: CheckoutItemInput[];
      shippingAddress: ReturnType<typeof toShippingAddress>;
      couponCode?: string;
      guestAccessToken?: string;
      customerEmail: string;
    },
    MagicCheckoutResult
  >;
  verifyPayment: CheckoutAction<
    {
      orderId: MagicCheckoutResult["orderId"];
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      guestAccessToken?: string;
    },
    VerifyPaymentResult
  >;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function useCheckoutPayment({
  cartItems,
  liveProducts,
  subtotal,
  shipping,
  couponCode,
  isAuthenticated,
  user,
  setCartItems,
  setStatusMessage,
  setErrorMessage,
  createMagicCheckout,
  createStandardCheckout,
  verifyPayment,
}: UseCheckoutPaymentArgs) {
  async function openRazorpayCheckout(session: MagicCheckoutResult) {
    const keyId = session.keyId ?? publicEnv.razorpayKeyId;
    const guestAccessToken = session.guestAccessToken ?? loadGuestAccessToken(window.localStorage);

    saveGuestAccessToken(window.localStorage, session.guestAccessToken);

    if (!keyId || !window.Razorpay || session.mode === "demo" || !session.razorpayOrderId) {
      setStatusMessage(
        `Pending order ${session.orderId} created in demo mode. Add Razorpay credentials to switch to live checkout.`,
      );
      setCartItems([]);
      return;
    }

    const checkout = new window.Razorpay({
      key: keyId,
      name: "WhÿClub",
      description: "Secure checkout for oversized graphic tees",
      order_id: session.razorpayOrderId,
      amount: (session.amount ?? subtotal) * 100,
      currency: session.currency ?? "INR",
      one_click_checkout: publicEnv.razorpayCheckoutMode === "magic",
      prefill: {
        name: shipping.fullName || user?.name || undefined,
        email: shipping.email || user?.email || undefined,
        contact: shipping.phoneNumber,
      },
      notes: {
        appOrderId: session.orderId,
      },
      theme: {
        color: "#111111",
      },
      handler: async (response) => {
        try {
          const verification = await verifyPayment({
            orderId: session.orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            guestAccessToken,
          });

          if (verification.ok) {
            setCartItems([]);
            setStatusMessage(
              isAuthenticated
                ? "Payment captured and order verified. Your order is now visible in account history."
                : "Payment captured and order verified. Sign in later to claim this guest order.",
            );
            setErrorMessage(null);
          } else {
            setErrorMessage("Payment verification failed. Please try again.");
          }
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
        }
      },
      modal: {
        ondismiss: () => {
          setStatusMessage("Checkout was closed before payment completion. Your cart is still here when you are ready.");
        },
      },
    });

    checkout.open();
  }

  async function submitPayment() {
    if (!liveProducts) {
      setErrorMessage("Product data is still loading. Try again in a moment.");
      setStatusMessage(null);
      return;
    }

    const liveProductMap = new Map(
      liveProducts.map((product) => [product.slug, product]),
    );
    const orderItems: CheckoutItemInput[] = cartItems.map((item) => {
      const product = liveProductMap.get(item.productSlug);
      if (!product) {
        throw new Error(`${item.productSlug} is missing from the live catalog.`);
      }

      return {
        productId: product._id,
        quantity: item.quantity,
        ...(item.size ? { size: item.size } : {}),
      };
    });

    const validation =
      publicEnv.razorpayCheckoutMode === "magic"
        ? { ok: true as const }
        : validateShippingForm(shipping);

    if (!validation.ok) {
      setErrorMessage(validation.message);
      return;
    }

    const checkoutSession =
      publicEnv.razorpayCheckoutMode === "magic"
        ? await createMagicCheckout({
            items: orderItems,
            couponCode: couponCode || undefined,
          })
        : await createStandardCheckout({
            items: orderItems,
            shippingAddress: toShippingAddress(shipping),
            couponCode: couponCode || undefined,
            guestAccessToken: loadGuestAccessToken(window.localStorage),
            customerEmail: shipping.email.trim(),
          });

    await openRazorpayCheckout(checkoutSession);
  }

  return {
    submitPayment,
    getErrorMessage,
  };
}

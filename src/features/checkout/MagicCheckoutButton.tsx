import { useConvexAuth, useQuery, useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { CartItem } from "@/lib/cart";
import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import { publicEnv } from "@/lib/env";
import { formatInr } from "@/lib/utils";
import { loadGuestAccessToken, saveGuestAccessToken } from "./guestAccessToken";
import { useRazorpayScript } from "./razorpayScript";
import type {
  CheckoutTotalsPreview,
  CheckoutItemInput,
  MagicCheckoutResult,
  VerifyPaymentResult,
} from "./types";

type MagicCheckoutButtonProps = {
  cart: CartItem[];
  subtotal: number;
  className: string;
  disabledClassName?: string;
  label?: string;
  onCartCleared: (items: CartItem[]) => void;
  statusClassName?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function DisabledMagicCheckoutButton({
  className,
  disabledClassName,
  label,
  statusClassName,
}: Pick<
  MagicCheckoutButtonProps,
  "className" | "disabledClassName" | "label" | "statusClassName"
>) {
  return (
    <div>
      <button
        type="button"
        disabled
        className={`${className} ${disabledClassName ?? ""}`}
      >
        {label ?? "Magic Checkout"}
      </button>
      <p className={statusClassName ?? "mt-3 text-center text-xs text-black/50"}>
        Configure Convex and Razorpay to enable Magic Checkout.
      </p>
    </div>
  );
}

function MagicCheckoutButtonLive({
  cart,
  subtotal,
  className,
  disabledClassName,
  label = "Magic Checkout",
  onCartCleared,
  statusClassName,
}: MagicCheckoutButtonProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const liveProducts = useQuery(
    api.products.getManyBySlugs,
    cart.length === 0
      ? "skip"
      : {
          slugs: cart.map((item) => item.productSlug),
        },
  ) as Array<{ _id: CheckoutItemInput["productId"]; slug: string }> | undefined;
  const createMagicCheckout = useAction(api.orders.createMagicCheckout);
  const verifyPayment = useAction(api.orders.verifyPayment);
  const isRazorpayReady = useRazorpayScript({
    keyId: publicEnv.razorpayKeyId,
    checkoutMode: "magic",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const orderItems = liveProducts
    ? cart.map((item) => {
        const product = liveProducts.find(
          (liveProduct) => liveProduct.slug === item.productSlug,
        );

        return product
          ? {
              productId: product._id,
              quantity: item.quantity,
              ...(item.size ? { size: item.size } : {}),
            }
          : null;
      })
    : null;
  const preview = useQuery(
    api.orders.previewCheckoutTotals,
    orderItems && orderItems.every(Boolean)
      ? {
          items: orderItems as CheckoutItemInput[],
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
        }
      : "skip",
  ) as CheckoutTotalsPreview | undefined;

  async function openMagicCheckout() {
    if (!liveProducts) {
      setError("Product data is still loading. Try again in a moment.");
      setStatus(null);
      return;
    }

    const liveProductMap = new Map(
      liveProducts.map((product) => [product.slug, product]),
    );
    const orderItems = cart.map((item) => {
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

    setIsSubmitting(true);
    setStatus("Opening Razorpay Magic Checkout...");
    setError(null);

    try {
      const checkoutSession = (await createMagicCheckout({
        items: orderItems,
        ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
      })) as MagicCheckoutResult;
      const keyId = checkoutSession.keyId ?? publicEnv.razorpayKeyId;
      const guestAccessToken =
        checkoutSession.guestAccessToken ??
        loadGuestAccessToken(window.localStorage);

      saveGuestAccessToken(
        window.localStorage,
        checkoutSession.guestAccessToken,
      );

      if (
        !keyId ||
        !window.Razorpay ||
        checkoutSession.mode === "demo" ||
        !checkoutSession.razorpayOrderId
      ) {
        setStatus(
          `Pending order ${checkoutSession.orderId} created in demo mode. Add Razorpay credentials to open Magic Checkout.`,
        );
        return;
      }

      const checkout = new window.Razorpay({
        key: keyId,
        name: "WhÿClub",
        description: "Magic checkout for oversized graphic tees",
        order_id: checkoutSession.razorpayOrderId,
        amount: (checkoutSession.amount ?? preview?.totalAmount ?? subtotal) * 100,
        currency: checkoutSession.currency ?? "INR",
        one_click_checkout: true,
        prefill: {
          name: user?.name ?? undefined,
          email: user?.email ?? undefined,
        },
        notes: {
          appOrderId: checkoutSession.orderId,
          checkoutMode: "guest_magic",
        },
        theme: {
          color: "#111111",
        },
        handler: async (response) => {
          try {
            const verification = (await verifyPayment({
              orderId: checkoutSession.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              guestAccessToken,
            })) as VerifyPaymentResult;

            if (verification.ok) {
              onCartCleared([]);
              setStatus("Payment verified. Your order is confirmed.");
              setError(null);
            } else {
              setError("Payment verification failed. Please contact support.");
            }
          } catch (verificationError) {
            setError(getErrorMessage(verificationError));
          }
        },
        modal: {
          ondismiss: () => {
            setStatus(
              "Magic Checkout was closed before payment completion. Your cart is still here.",
            );
          },
        },
      });

      checkout.open();
    } catch (checkoutError) {
      setError(getErrorMessage(checkoutError));
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  const disabled =
    isSubmitting ||
    isLoading ||
    cart.length === 0 ||
    (!!publicEnv.razorpayKeyId && !isRazorpayReady);
  const buttonLabel = (() => {
    if (isSubmitting) {
      return "Opening checkout...";
    }
    if (isLoading || !liveProducts) {
      return "Loading checkout...";
    }
    if (!!publicEnv.razorpayKeyId && !isRazorpayReady) {
      return "Loading Razorpay...";
    }
    return label;
  })();

  return (
    <div>
      <div className="mb-4 rounded-xl border border-black/5 bg-black/[0.02] p-3">
        <div className="flex gap-2">
          <input
            value={couponCode}
            onChange={(event) => {
              setCouponCode(event.target.value.toUpperCase());
              setError(null);
              setStatus(null);
            }}
            className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-[0.65rem] font-bold uppercase tracking-widest text-black outline-none transition focus:border-black"
            placeholder="Coupon code"
          />
          <span className="flex items-center rounded-lg border border-black/10 bg-white px-3 text-[0.58rem] font-bold uppercase tracking-widest text-black/40">
            Live
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-[0.68rem] font-semibold uppercase tracking-widest text-black/60">
          <div className="flex justify-between">
            <span>Server subtotal</span>
            <span className="text-black">{formatInr(preview?.subtotal ?? subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Coupon discount</span>
            <span className={preview?.discountAmount ? "text-green-700" : "text-black/40"}>
              - {formatInr(preview?.discountAmount ?? 0)}
            </span>
          </div>
          <div className="flex justify-between text-black">
            <span>Payable total</span>
            <span>{formatInr(preview?.totalAmount ?? subtotal)}</span>
          </div>
        </div>
        {couponCode.trim() && preview?.couponStatus.message ? (
          <p className={`mt-3 text-[0.6rem] font-bold uppercase tracking-widest ${
            preview.couponStatus.ok ? "text-green-700" : "text-amber-700"
          }`}>
            {preview.couponStatus.message}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => void openMagicCheckout()}
        className={`${className} ${disabled ? (disabledClassName ?? "") : ""}`}
      >
        {buttonLabel}
      </button>
      {(status || error) ? (
        <p
          className={
            statusClassName ??
            `mt-3 text-center text-xs ${error ? "text-red-600" : "text-green-700"}`
          }
        >
          {error ?? status}
        </p>
      ) : null}
    </div>
  );
}

export function MagicCheckoutButton(props: MagicCheckoutButtonProps) {
  return (
    <ConvexClientBoundary
      fallback={
        <DisabledMagicCheckoutButton
          className={props.className}
          disabledClassName={props.disabledClassName}
          label={props.label}
          statusClassName={props.statusClassName}
        />
      }
    >
      <MagicCheckoutButtonLive {...props} />
    </ConvexClientBoundary>
  );
}

import { ConvexClientBoundary } from "@/components/react/ConvexClientBoundary";
import { MagicCheckoutButton } from "@/features/checkout/MagicCheckoutButton";
import { useCheckoutCart } from "@/features/checkout/useCheckoutCart";
import type { DemoProduct } from "@/lib/types";
import { formatInr } from "@/lib/utils";

type CheckoutExperienceProps = {
  initialProductSlug?: string;
  demoProducts: DemoProduct[];
};

function EmptyCheckoutState() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-sm md:p-10">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
          checkout
        </p>
        <h1 className="mt-4 text-4xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-black md:text-6xl">
          Your cart is empty.
        </h1>
        <p className="mt-5 text-sm leading-8 text-neutral-600">
          Add a tee to the cart first. Magic Checkout opens directly from your cart.
        </p>
        <a href="/collections" className="store-btn store-btn--dark mt-8">
          browse products
        </a>
      </div>
    </section>
  );
}

export default function CheckoutExperience({
  initialProductSlug,
  demoProducts,
}: CheckoutExperienceProps) {
  const checkoutCart = useCheckoutCart({ initialProductSlug, demoProducts });

  if (!checkoutCart.isReady) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 text-sm text-neutral-600 md:px-6">
        Loading Magic Checkout...
      </section>
    );
  }

  if (checkoutCart.isEmpty) {
    return <EmptyCheckoutState />;
  }

  return (
    <section className="redesign-root min-h-screen bg-[#F9F9F9] px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm md:p-10">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-red-600">
            Magic checkout
          </p>
          <h1 className="mt-4 text-5xl font-black uppercase leading-[0.85] tracking-[-0.06em] text-black md:text-7xl">
            Opening Razorpay.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-neutral-600">
            We removed the old in-site checkout form. Razorpay Magic Checkout
            now collects delivery details, coupons, shipping, and payment in one
            secure flow.
          </p>
          <a
            href="/cart"
            className="mt-8 inline-flex text-[0.65rem] font-bold uppercase tracking-widest text-black/50 transition hover:text-black"
          >
            review cart instead
          </a>
        </div>

        <aside className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="font-editorial text-xs font-bold uppercase tracking-widest text-black">
            Order summary
          </h2>
          <div className="mt-5 space-y-4">
            {checkoutCart.displayItems.map((item) => (
              <div
                key={`${item.productSlug}-${item.size}`}
                className="flex items-center gap-4"
              >
                <img
                  src={item.imageUrl}
                  alt={item.productTitle}
                  className="h-16 w-12 rounded-lg bg-[#F5F5F5] object-cover object-top"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-editorial text-[0.65rem] font-bold uppercase tracking-widest text-black">
                    {item.productTitle}
                  </p>
                  <p className="mt-1 text-[0.6rem] text-black/50">
                    {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-bold text-black">
                  {formatInr(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="my-6 border-t border-black/5 pt-5">
            <div className="flex items-end justify-between">
              <span className="font-editorial text-sm font-bold text-black">
                Total
              </span>
              <span className="text-2xl font-black leading-none text-black">
                {formatInr(checkoutCart.subtotal)}
              </span>
            </div>
          </div>

          <ConvexClientBoundary
            fallback={
              <button
                type="button"
                disabled
                className="flex h-14 w-full items-center justify-center rounded-lg bg-black text-[0.75rem] font-bold uppercase tracking-widest text-white opacity-50"
              >
                configure Convex first
              </button>
            }
          >
            <MagicCheckoutButton
              cart={checkoutCart.cartItems}
              subtotal={checkoutCart.subtotal}
              onCartCleared={checkoutCart.setCartItems}
              label="Open Magic Checkout"
              className="flex h-14 w-full items-center justify-center rounded-lg bg-black text-[0.75rem] font-bold uppercase tracking-widest text-white transition hover:bg-black/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              statusClassName="mt-4 text-center text-[0.62rem] font-bold uppercase tracking-widest text-black/50"
            />
          </ConvexClientBoundary>
        </aside>
      </div>
    </section>
  );
}

import { useMemo } from "react";
import { type CartItem } from "@/lib/cart";
import { demoProducts } from "@/lib/demo-data";
import { useCartState } from "@/components/react/StorefrontClient";
import { DesktopCart } from "./DesktopCart";
import { MobileCart } from "./MobileCart";

export default function CartExperience() {
  const { cart, count, setAndPersistCart } = useCartState();

  const items = useMemo(
    () =>
      cart
        .map((item) => {
          const product = demoProducts.find(
            (candidate) => candidate.slug === item.productSlug,
          );

          if (!product) {
            return null;
          }

          return {
            ...item,
            product,
            total: item.quantity * product.sellingPrice,
          };
        })
        .filter(
          (
            item,
          ): item is CartItem & {
            product: (typeof demoProducts)[number];
            total: number;
          } => item !== null,
        ),
    [cart],
  );

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  if (items.length === 0) {
    return (
      <div className="redesign-root flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="text-center rounded-[2rem] glass-panel p-12 premium-shadow max-w-md w-full border border-black/5">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
            <span className="text-3xl opacity-50">▱</span>
          </div>
          <h1 className="heading-condensed text-4xl font-black uppercase text-black mb-3">
            Cart is Empty
          </h1>
          <p className="font-editorial text-sm text-neutral-500 mb-8">
            Your cart is currently empty. Start building your basket with the latest drops.
          </p>
          <a
            href="/"
            className="flex h-14 items-center justify-center rounded-full bg-black px-8 text-[0.7rem] font-bold uppercase tracking-widest text-white transition-transform active:scale-95 premium-shadow"
          >
            Shop Latest Drops
          </a>
        </div>
      </div>
    );
  }

  const commonProps = {
    items,
    subtotal,
    count,
    cart,
    setAndPersistCart,
  };

  return (
    <>
      <div className="hidden lg:block">
        <DesktopCart {...commonProps} />
      </div>
      <div className="block lg:hidden">
        <MobileCart {...commonProps} />
      </div>
    </>
  );
}

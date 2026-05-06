import { useState } from "react";
import { useCartState } from "./StorefrontClient";
import { updateCartQuantity } from "@/lib/cart";

export function MobileProductAddToCart(props: {
  productSlug: string;
  productTitle: string;
  priceLabel: string;
  availableSizes: string[];
  soldOutSizes: string[];
  checkoutHref: string;
}) {
  const { cart, setAndPersistCart } = useCartState();
  const initialSize =
    props.availableSizes.find((size) => !props.soldOutSizes.includes(size)) ??
    props.availableSizes[0] ??
    "";
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);

  const canAdd =
    selectedSize.length > 0 && !props.soldOutSizes.includes(selectedSize);

  return (
    <div className="flex flex-col">
      {/* Size Selector */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="font-editorial text-sm font-bold uppercase tracking-widest text-black">
            Select Size
          </p>
          <button className="font-editorial text-xs text-black/60 hover:text-black transition-colors">
            Size guide
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {["S", "M", "L", "XL", "XXL"].map((size) => {
            const soldOut = props.soldOutSizes.includes(size);
            const active = selectedSize === size;

            return (
              <button
                key={size}
                type="button"
                disabled={soldOut}
                onClick={() => setSelectedSize(size)}
                className={[
                  "flex h-10 items-center justify-center rounded-lg border text-xs font-medium uppercase transition-all",
                  soldOut
                    ? "cursor-not-allowed border-black/5 bg-[#f9f9f9] text-black/30 line-through"
                    : active
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-transparent text-black hover:border-black/30",
                ].join(" ")}
              >
                {size}
              </button>
            );
          })}
        </div>
        {message && (
          <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-widest text-[#DFFF3F]">
            {message}
          </p>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/5 px-6 pt-4 pb-safe flex items-center justify-between gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <strong className="text-xl font-black text-black">{props.priceLabel}</strong>

        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            if (added) {
              window.location.assign("/cart");
              return;
            }
            if (!canAdd) return;
            const nextCart = updateCartQuantity(cart, {
              productSlug: props.productSlug,
              size: selectedSize,
              quantity: 1,
            });
            setAndPersistCart(nextCart);
            setAdded(true);
            setMessage("Added to cart. Opening cart...");
            window.setTimeout(() => {
              window.location.assign("/cart");
            }, 700);
          }}
          className="flex-1 rounded-full bg-black h-14 text-xs font-bold uppercase tracking-widest text-white transition-transform active:scale-95 disabled:bg-black/20"
        >
          {added ? "View Cart" : "Add To Cart"}
        </button>
      </div>
      <style>{`.pb-safe { padding-bottom: max(env(safe-area-inset-bottom), 1.5rem); }`}</style>
    </div>
  );
}

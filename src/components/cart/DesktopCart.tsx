import { formatInr } from "@/lib/utils";
import { removeCartItem, replaceCartItemQuantity } from "@/lib/cart";
import { Heart, Trash2, Plus, Lock } from "lucide-react";
import { demoProducts } from "@/lib/demo-data";
import { MagicCheckoutButton } from "@/features/checkout/MagicCheckoutButton";

export function DesktopCart({ items, subtotal, count, cart, setAndPersistCart }: any) {
  const crossSells = demoProducts.slice(0, 2);

  return (
    <div className="redesign-root flex flex-col pt-8 pb-24 bg-[#F9F9F9] min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">

        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] xl:gap-24">

          {/* Left: Item List */}
          <div className="flex flex-col gap-6">
            <h1 className="font-editorial text-[0.8rem] font-bold uppercase tracking-widest text-black mb-2">
              Your Cart ({count})
            </h1>

            <div className="flex flex-col gap-4">
              {items.map((item: any) => (
                <article key={`${item.product.slug}-${item.size}`} className="relative flex gap-6 rounded-[1.5rem] bg-white p-4 border border-black/5 shadow-sm">
                  <a href={`/products/${item.product.slug}`} className="block w-28 shrink-0 overflow-hidden rounded-xl bg-[#F5F5F5]">
                    <img src={item.product.images[0]} alt={item.product.title} className="aspect-[4/5] w-full object-cover object-top" loading="lazy" />
                  </a>

                  <div className="flex flex-1 flex-col py-2">
                    <div className="flex justify-between items-start mb-1">
                      <h2 className="font-editorial text-[0.7rem] font-bold uppercase tracking-widest text-black">
                        {item.product.title}
                      </h2>
                    </div>

                    <p className="font-editorial text-[0.65rem] text-black/50 mb-3">
                      {item.product.color || "White"} / {item.size}
                    </p>

                    <p className="text-base font-black text-black mb-auto">{formatInr(item.total)}</p>

                    <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setAndPersistCart(replaceCartItemQuantity(cart, item, Math.max(0, item.quantity - 1)))} className="flex h-6 w-6 items-center justify-center text-black/50 hover:text-black transition-colors">−</button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => setAndPersistCart(replaceCartItemQuantity(cart, item, Math.min(10, item.quantity + 1)))} className="flex h-6 w-6 items-center justify-center text-black/50 hover:text-black transition-colors">+</button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => setAndPersistCart(removeCartItem(cart, item))} className="flex h-8 w-8 items-center justify-center text-black/40 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center text-black/40 hover:text-black transition-colors">
                          <Heart className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Right: Order Summary & Cross-sell */}
          <div className="flex flex-col gap-8">
            <h2 className="font-editorial text-[0.8rem] font-bold uppercase tracking-widest text-black mb-2 opacity-0 select-none">
              Summary
            </h2>

            <div className="rounded-[1.5rem] bg-white p-8 border border-black/5 shadow-sm">
              <h3 className="font-editorial text-xs font-bold uppercase tracking-widest text-black mb-6">Order Summary</h3>

              <div className="flex flex-col gap-4 border-b border-black/5 pb-6 mb-6">
                <div className="flex justify-between font-editorial text-[0.75rem] text-black/70">
                  <span>Subtotal</span>
                  <span className="text-black font-semibold">{formatInr(subtotal)}</span>
                </div>
                <div className="flex justify-between font-editorial text-[0.75rem] text-black/70">
                  <span>Shipping</span>
                  <span className="text-black font-semibold">FREE</span>
                </div>
                <div className="flex justify-between font-editorial text-[0.75rem] text-black/70">
                  <span>Discount</span>
                  <span className="text-green-600 font-semibold">- {formatInr(0)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8">
                <span className="font-editorial text-sm font-bold text-black">Total</span>
                <span className="text-2xl font-black text-black leading-none">{formatInr(subtotal)}</span>
              </div>

              <MagicCheckoutButton
                cart={cart}
                subtotal={subtotal}
                onCartCleared={setAndPersistCart}
                label="Proceed to Magic Checkout"
                className="group mb-6 flex h-14 w-full items-center justify-center rounded-lg bg-black text-[0.75rem] font-bold uppercase tracking-widest text-white transition-transform hover:bg-black/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                statusClassName="mb-4 text-center text-[0.62rem] font-bold uppercase tracking-widest text-black/50"
              />

              <div className="flex justify-center items-center gap-1.5 text-black/40 text-[0.6rem] font-medium">
                <Lock className="w-3 h-3" strokeWidth={2} />
                <span>Secure checkout powered by</span>
                <strong className="text-blue-900 font-bold italic ml-0.5">Razorpay</strong>
              </div>
            </div>

            {/* You May Also Like (Desktop) */}
            <div>
              <h3 className="font-editorial text-xs font-bold uppercase tracking-widest text-black mb-4">You May Also Like</h3>
              <div className="grid grid-cols-2 gap-4">
                {crossSells.map((product) => (
                  <a key={product.slug} href={`/products/${product.slug}`} className="group flex flex-col bg-white rounded-[1.25rem] p-3 border border-black/5 shadow-sm transition-colors hover:border-black/10">
                    <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-[#F5F5F5] mb-3">
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                      <button className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-sm text-black/60 hover:text-black transition-colors">
                        <Heart className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="px-1 pb-1">
                      <h3 className="font-editorial text-[0.65rem] font-bold uppercase tracking-widest text-black mb-2 truncate">{product.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-black">{formatInr(product.sellingPrice)}</span>
                        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-black hover:bg-black hover:text-white transition-colors">
                          <Plus className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

import { formatInr } from "@/lib/utils";
import { removeCartItem, replaceCartItemQuantity } from "@/lib/cart";
import { ArrowLeft, Heart, Trash2, Plus, Lock, ShieldCheck, Undo2, CreditCard } from "lucide-react";
import { demoProducts } from "@/lib/demo-data";
import { MagicCheckoutButton } from "@/features/checkout/MagicCheckoutButton";

export function MobileCart({ items, subtotal, count, cart, setAndPersistCart }: any) {
  // Grab some products for cross-sell
  const crossSells = demoProducts.slice(0, 2);

  return (
    <div className="redesign-root flex flex-col pb-10 pt-12 bg-[#F9F9F9] min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F9F9F9]/90 backdrop-blur-md px-5 py-4 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="text-black transition-colors">
          <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
        </button>
        <h1 className="font-editorial text-[0.8rem] font-bold uppercase tracking-widest text-black pt-1">
          Your Cart ({count})
        </h1>
        <div className="w-6"></div> {/* Spacer for centering */}
      </header>

      <div className="flex flex-col gap-3 px-5 pt-8">
        {items.map((item: any) => (
          <article key={`${item.product.slug}-${item.size}`} className="relative flex gap-4 rounded-2xl bg-[#F5F5F5] p-3">
            <a href={`/products/${item.product.slug}`} className="block w-24 shrink-0 overflow-hidden rounded-xl bg-white">
              <img src={item.product.images[0]} alt={item.product.title} className="aspect-[3/4] w-full object-cover" />
            </a>

            <div className="flex flex-1 flex-col justify-center py-1">
              <button className="absolute top-4 right-4 text-black/40 hover:text-black">
                <Heart className="w-4 h-4" strokeWidth={1.5} />
              </button>

              <div>
                <h2 className="font-editorial text-[0.7rem] font-bold uppercase tracking-widest text-black pr-6 mb-1">
                  {item.product.title}
                </h2>
                <p className="font-editorial text-[0.6rem] text-black/50 mb-3">
                  {item.product.color || "White"} / {item.size}
                </p>
                <p className="text-sm font-black text-black mb-4">{formatInr(item.total)}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 rounded-full bg-white px-2 py-1 shadow-sm">
                  <button onClick={() => setAndPersistCart(replaceCartItemQuantity(cart, item, Math.max(0, item.quantity - 1)))} className="flex h-6 w-6 items-center justify-center text-black text-xs active:scale-95 smooth-transition">−</button>
                  <span className="text-xs font-bold w-3 text-center">{item.quantity}</span>
                  <button onClick={() => setAndPersistCart(replaceCartItemQuantity(cart, item, Math.min(10, item.quantity + 1)))} className="flex h-6 w-6 items-center justify-center text-black text-xs active:scale-95 smooth-transition">+</button>
                </div>
                <button onClick={() => setAndPersistCart(removeCartItem(cart, item))} className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-black/40 hover:text-black active:scale-95 smooth-transition">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="px-5 mt-6 mb-10">
        <h3 className="font-editorial text-xs font-bold uppercase tracking-widest text-black mb-4">Order Summary</h3>
        <div className="rounded-2xl bg-white p-5 border border-black/5 shadow-sm">

          <div className="flex flex-col gap-3 py-2 mb-4 border-b border-black/5 pb-5">
            <div className="flex justify-between font-editorial text-xs text-black/70">
              <span>Subtotal</span>
              <span className="text-black font-semibold">{formatInr(subtotal)}</span>
            </div>
            <div className="flex justify-between font-editorial text-xs text-black/70">
              <span>Shipping</span>
              <span className="text-black font-semibold">FREE</span>
            </div>
            <div className="flex justify-between font-editorial text-xs text-black/70">
              <span>Discount</span>
              <span className="text-green-600 font-semibold">- {formatInr(0)}</span>
            </div>
          </div>

          <div className="flex justify-between items-end mb-6">
            <span className="font-editorial text-sm font-bold text-black">Total</span>
            <span className="text-lg font-black text-black leading-none">{formatInr(subtotal)}</span>
          </div>

          <MagicCheckoutButton
            cart={cart}
            subtotal={subtotal}
            onCartCleared={setAndPersistCart}
            label="Proceed to Magic Checkout"
            className="group mb-4 flex h-14 w-full items-center justify-center rounded-full bg-black text-[0.7rem] font-bold uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            statusClassName="mb-4 text-center text-[0.55rem] font-bold uppercase tracking-widest text-black/50"
          />

          <div className="flex justify-center items-center gap-1.5 text-black/40 text-[0.55rem] font-medium">
            <Lock className="w-3 h-3" strokeWidth={2} />
            <span>Secure checkout powered by</span>
            <strong className="text-blue-900 font-bold italic ml-0.5">Razorpay</strong>
          </div>
        </div>
      </div>

      {/* You May Also Like */}
      <section className="px-5 py-4">
        <h3 className="font-editorial text-xs font-bold uppercase tracking-widest text-black mb-4">You May Also Like</h3>
        <div className="grid grid-cols-2 gap-3">
          {crossSells.map((product) => (
            <a key={product.slug} href={`/products/${product.slug}`} className="group flex flex-col bg-white rounded-2xl p-2 border border-black/5 shadow-sm">
              <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-[#F5F5F5] mb-3">
                <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover object-top smooth-transition group-hover:scale-105" />
                <button className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full text-black/40 hover:text-black">
                  <Heart className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="px-1 pb-1">
                <h3 className="font-editorial text-[0.6rem] font-bold uppercase tracking-widest text-black mb-2 truncate">{product.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-black">{formatInr(product.sellingPrice)}</span>
                  <button className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 text-black hover:bg-black hover:text-white transition-colors">
                    <Plus className="w-3 h-3" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Trust Badges Footer */}
      <section className="px-5 py-8 mt-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center text-center">
            <ShieldCheck className="w-5 h-5 text-black mb-2 opacity-80" strokeWidth={1.5} />
            <span className="text-[0.45rem] font-bold uppercase tracking-widest text-black leading-tight mb-1">100% Premium<br/>Cotton</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <Undo2 className="w-5 h-5 text-black mb-2 opacity-80" strokeWidth={1.5} />
            <span className="text-[0.45rem] font-bold uppercase tracking-widest text-black leading-tight mb-1">Easy Returns<br/>7 Day Policy</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <CreditCard className="w-5 h-5 text-black mb-2 opacity-80" strokeWidth={1.5} />
            <span className="text-[0.45rem] font-bold uppercase tracking-widest text-black leading-tight mb-1">Secure Payment<br/>UPI, Cards & More</span>
          </div>
        </div>
      </section>

    </div>
  );
}

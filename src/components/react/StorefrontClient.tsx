import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  CART_CHANGED_EVENT,
  countCartItems,
  loadCartFromStorage,
  syncCartToStorage,
  type CartItem,
  updateCartQuantity,
} from "@/lib/cart";
import { getConvexClient, hasConvexUrl } from "@/lib/convex";

export function useCartState() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const refresh = () => {
      setCart(loadCartFromStorage(window.localStorage));
    };

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(CART_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CART_CHANGED_EVENT, refresh);
    };
  }, []);

  const setAndPersistCart = (next: CartItem[]) => {
    setCart(next);
    syncCartToStorage(window.localStorage, next);
  };

  return {
    cart,
    count: countCartItems(cart),
    setAndPersistCart,
  };
}

function ConvexGate({ children }: { children: ReactNode }) {
  const client = useMemo(() => getConvexClient(), []);

  if (!client) {
    return <>{children}</>;
  }

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}

function buttonClassName(mode: "dark" | "light" | "ghost" = "light") {
  if (mode === "dark") {
    return "rounded-full border border-black bg-black px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-white transition hover:bg-[#1c1c1c]";
  }

  if (mode === "ghost") {
    return "rounded-full border border-black/10 bg-white/80 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-500 transition hover:border-black/25 hover:text-neutral-950";
  }

  return "rounded-full border border-black/10 bg-white/90 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-neutral-800 transition hover:border-black/25 hover:text-black";
}

export function AuthActionButton({
  label = "sign in / sign up",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { signIn } = useAuthActions();

  return (
    <button
      type="button"
      onClick={() => {
        void signIn("google", {
          redirectTo: window.location.href,
        });
      }}
      className={className ?? buttonClassName()}
    >
      {label}
    </button>
  );
}

function HeaderAuthState() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();

  if (isLoading) {
    return (
      <span className="flex items-center gap-2 font-editorial text-sm font-extrabold uppercase tracking-[0.08em] text-black/40">
        <User className="w-4 h-4" strokeWidth={1.5} />
        <span className="hidden md:inline">...</span>
      </span>
    );
  }

  if (!isAuthenticated) {
    return (
      <a href="/login" className="flex items-center gap-2 font-editorial text-sm font-extrabold uppercase tracking-[0.08em] text-black/70 transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
        <User className="w-4 h-4" strokeWidth={1.5} />
        <span className="hidden md:inline">Account</span>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <a href="/account" className="flex items-center gap-2 font-editorial text-sm font-extrabold uppercase tracking-[0.08em] text-black/70 transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
        <User className="w-4 h-4" strokeWidth={1.5} />
        <span className="hidden md:inline">{user?.name?.split(" ")[0] ?? "Account"}</span>
      </a>
      <button
        type="button"
        onClick={() => {
          void (async () => {
            await signOut();
            window.location.reload();
          })();
        }}
        className="hidden font-editorial text-sm font-extrabold uppercase tracking-[0.08em] text-black/40 transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black md:inline"
      >
        Sign Out
      </button>
    </div>
  );
}

import { ShoppingBag, User } from "lucide-react";

export function HeaderAuthCartControls() {
  const { count } = useCartState();

  if (!hasConvexUrl()) {
    return (
      <div className="flex items-center gap-6">
        <a href="/login" className="flex items-center gap-2 font-editorial text-sm font-extrabold uppercase tracking-[0.08em] text-black/70 transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
          <User className="w-4 h-4" strokeWidth={1.5} />
          <span className="hidden md:inline">Account</span>
        </a>
        <a href="/cart" className="flex items-center gap-2 font-editorial text-sm font-extrabold uppercase tracking-[0.08em] text-black/70 transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
          <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
          <span className="hidden md:inline">Cart ({count})</span>
        </a>
      </div>
    );
  }

  return (
    <ConvexGate>
      <div className="flex items-center gap-6">
        <HeaderAuthState />
        <a href="/cart" className="flex items-center gap-2 font-editorial text-sm font-extrabold uppercase tracking-[0.08em] text-black/70 transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">
          <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
          <span className="hidden md:inline">Cart ({count})</span>
        </a>
      </div>
    </ConvexGate>
  );
}

export function ProductAddToCart(props: {
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
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!selectedSize) {
      return;
    }

    if (!props.soldOutSizes.includes(selectedSize)) {
      return;
    }

    const fallbackSize = props.availableSizes.find(
      (size) => !props.soldOutSizes.includes(size),
    );
    if (fallbackSize) {
      setSelectedSize(fallbackSize);
    }
  }, [props.availableSizes, props.soldOutSizes, selectedSize]);

  const canAdd =
    selectedSize.length > 0 && !props.soldOutSizes.includes(selectedSize);

  return (
    <div className="flex flex-col mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-editorial text-[0.65rem] font-bold uppercase tracking-widest text-black">
          Select Size
        </h3>
        <button className="font-editorial text-[0.65rem] text-black/50 hover:text-black">
          Size guide
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {props.availableSizes.map((size) => {
          const soldOut = props.soldOutSizes.includes(size);
          const active = selectedSize === size;

          return (
            <button
              key={size}
              type="button"
              disabled={soldOut}
              onClick={() => setSelectedSize(size)}
              className={[
                "flex h-10 min-w-[3rem] items-center justify-center rounded-lg border px-3 text-xs font-bold uppercase tracking-widest transition-colors",
                soldOut
                  ? "cursor-not-allowed border-black/5 bg-[#F5F5F5] text-black/20"
                  : active
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white text-black hover:border-black/30",
              ].join(" ")}
            >
              {size}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 items-center rounded-lg border border-black/10 bg-white px-1">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="flex h-10 w-10 items-center justify-center text-black/50 hover:text-black"
          >
            -
          </button>
          <span className="w-8 text-center text-sm font-bold text-black">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(10, value + 1))}
            className="flex h-10 w-10 items-center justify-center text-black/50 hover:text-black"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            if (added) {
              window.location.assign("/cart");
              return;
            }
            if (!canAdd) {
              setMessage("Select an available size first.");
              return;
            }
            const nextCart = updateCartQuantity(cart, {
              productSlug: props.productSlug,
              size: selectedSize,
              quantity,
            });
            setAndPersistCart(nextCart);
            setAdded(true);
            setMessage(`Added ${quantity} to cart. Opening cart...`);
            window.setTimeout(() => {
              window.location.assign("/cart");
            }, 700);
          }}
          className="flex-1 flex h-12 items-center justify-center rounded-lg bg-black px-6 text-[0.65rem] font-bold uppercase tracking-widest text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-black/20"
        >
          {added ? "View Cart" : "Add to Cart"}
        </button>

        <button className="flex h-12 w-12 items-center justify-center rounded-lg border border-black/10 text-black/50 hover:text-black hover:border-black/30 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </div>

      {message && (
        <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-widest text-green-600">
          {message}
        </p>
      )}
    </div>
  );
}

export function StorefrontClientBridge() {
  return null;
}

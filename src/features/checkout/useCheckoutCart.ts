import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/cart";
import {
  countCartItems,
  loadCartFromStorage,
  syncCartToStorage,
} from "@/lib/cart";
import type { DemoProduct } from "@/lib/types";
import type { DisplayItem } from "./types";

function getDefaultSize(product: DemoProduct) {
  return product.sizes.find((size) => !product.soldOutSizes.includes(size)) ?? product.sizes[0] ?? "M";
}

export function useCheckoutCart(args: {
  initialProductSlug?: string;
  demoProducts: DemoProduct[];
}) {
  const productMap = useMemo(
    () => new Map(args.demoProducts.map((product) => [product.slug, product])),
    [args.demoProducts],
  );
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const nextItems = loadCartFromStorage(window.localStorage);

    if (nextItems.length === 0 && args.initialProductSlug) {
      const product = productMap.get(args.initialProductSlug);
      if (product) {
        nextItems.push({
          productSlug: product.slug,
          quantity: 1,
          size: getDefaultSize(product),
        });
      }
    }

    setCartItems(nextItems);
    setIsReady(true);
  }, [args.initialProductSlug, productMap]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    syncCartToStorage(window.localStorage, cartItems);
  }, [cartItems, isReady]);

  const displayItems = useMemo<DisplayItem[]>(
    () =>
      cartItems
        .map((item) => {
          const product = productMap.get(item.productSlug);
          if (!product) {
            return null;
          }

          return {
            productSlug: item.productSlug,
            productTitle: product.title,
            imageUrl: product.images[0] ?? "",
            unitPrice: product.sellingPrice,
            quantity: item.quantity,
            size: item.size,
            material: product.material,
            weightGsm: product.weightGsm,
          };
        })
        .filter((item): item is DisplayItem => item !== null),
    [cartItems, productMap],
  );

  const subtotal = displayItems.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );

  return {
    cartItems,
    displayItems,
    isReady,
    isEmpty: displayItems.length === 0,
    itemCount: countCartItems(cartItems),
    subtotal,
    setCartItems,
  };
}

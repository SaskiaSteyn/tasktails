"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Shares the store's cart-item count between the header badge (`CartLink`)
 * and every `StoreItemCard`'s add-to-cart button — siblings in the tree
 * (the header is a prop passed to `AppShell`, the grid is `AppShell`'s
 * children), so a plain prop can't carry an update from one to the other.
 *
 * Found and fixed after shipping: the badge only reflected the server's
 * count as of the last full page load, so adding an item didn't move it
 * until a refresh. `increment()` is a client-side +1 the moment a
 * `POST /api/store/cart` succeeds — cheap and correct, since STOR-12 always
 * adds quantity 1 per click and the badge only needs to track *count*, not
 * the cart's actual contents (which STOR-06's cart panel already owns).
 */
const CartCountContext = createContext<{
  count: number;
  increment: () => void;
} | null>(null);

export function CartCountProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: ReactNode;
}) {
  const [count, setCount] = useState(initialCount);
  return (
    <CartCountContext.Provider value={{ count, increment: () => setCount((c) => c + 1) }}>
      {children}
    </CartCountContext.Provider>
  );
}

/**
 * Null outside a `CartCountProvider` rather than throwing — lets
 * `StoreItemCard` call this unconditionally without every non-store screen
 * that might reuse it someday needing to guarantee the provider is mounted.
 */
export function useCartCount() {
  return useContext(CartCountContext);
}

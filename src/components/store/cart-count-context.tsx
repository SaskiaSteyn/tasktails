"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

import { CartAddOverlay, type CartAdd, type Point } from "@/components/store/cart-add-overlay";

/**
 * Shares the store's cart state between the header badge (`CartLink`)
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
 *
 * #274 put the add-to-cart *feedback* here too rather than in a second
 * provider: this one already spans exactly the two things the flourish has
 * to reach across — the icon it flies to and the buttons it flies from —
 * and a parallel provider around the same subtree would only duplicate that
 * span. `announceAdded()` raises it; `registerCartAnchor()` is how whichever
 * `CartLink` is currently on screen says where it is.
 */

type CartCountValue = {
  count: number;
  increment: () => void;
  /**
   * Raise the add-to-cart flourish (#274). `origin` is the element that was
   * pressed, used as the flight's starting point — pass null and the toast
   * still shows, just without the travel.
   */
  announceAdded: (label: string, origin: HTMLElement | null) => void;
  /**
   * Registers a cart icon as the flourish's target. A callback ref: React
   * calls it with the node on mount and with null on unmount, so the set
   * below stays honest as breakpoints swap one `CartLink` for another.
   */
  registerCartAnchor: (node: HTMLElement | null) => void;
};

const CartCountContext = createContext<CartCountValue | null>(null);

/** Centre of an element, in viewport coordinates. */
function centreOf(element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function CartCountProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: ReactNode;
}) {
  const [count, setCount] = useState(initialCount);
  const [add, setAdd] = useState<CartAdd | null>(null);

  // A set, not a single ref: `/store` renders two `CartLink`s — one in the
  // header, one inside `StoreBrowser` — each shown at a different width, and
  // both are mounted in the DOM at all times because the switch is a media
  // query. Only the one actually laid out is a sensible target, which is
  // what the `offsetParent` check below picks out. At `xl:` neither shows
  // (the cart rail replaces them) and there is simply no target.
  const anchors = useRef(new Set<HTMLElement>());
  const nextId = useRef(0);

  const registerCartAnchor = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    anchors.current.add(node);
    return () => {
      anchors.current.delete(node);
    };
  }, []);

  const announceAdded = useCallback((label: string, origin: HTMLElement | null) => {
    // `offsetParent` is null for a `display: none` element, which is exactly
    // what the hidden-at-this-width `CartLink` is.
    const visible = [...anchors.current].find((node) => node.offsetParent !== null);

    setAdd({
      id: (nextId.current += 1),
      label,
      cart: visible ? centreOf(visible) : null,
      origin: origin ? centreOf(origin) : null,
    });
  }, []);

  const dismiss = useCallback(() => setAdd(null), []);

  return (
    <CartCountContext.Provider
      value={{
        count,
        increment: () => setCount((c) => c + 1),
        announceAdded,
        registerCartAnchor,
      }}
    >
      {children}
      <CartAddOverlay add={add} onDismiss={dismiss} />
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

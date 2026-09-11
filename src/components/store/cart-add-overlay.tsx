"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useEffect } from "react";

import { cn } from "@/lib/cn";

/**
 * #274 — what an add-to-cart looks like beyond the button's own green tick.
 *
 * Two pieces, both driven by rectangles measured at the moment of the add
 * (see `CartCountProvider`, which owns the state and does the measuring):
 *
 *  - a **toast** pinned under the cart icon, so the confirmation appears
 *    where the thing it is confirming lives, and
 *  - a **flying mark** that travels from the pressed "+" to that same icon.
 *
 * Both are positioned `fixed` off real coordinates rather than being placed
 * in the layout, which is what makes one implementation work across all
 * three shells this app has: edge-to-edge on a phone, a 400px card floating
 * on the board from `frame:` up, and the desktop layout where the cart icon
 * moves out of the header and into `StoreBrowser` entirely. Anchoring to the
 * element rather than to a corner means none of those need a special case.
 *
 * `aria-hidden` throughout: `StoreItemCard` already announces the outcome on
 * its own `role="status"` line, and a second live region saying the same
 * thing would have a screen reader read every add twice. This is the visual
 * half only.
 *
 * Reduce motion is handled entirely in globals.css, which forces
 * `animation-duration` to ~0 under both the OS setting and PRO-14's in-app
 * toggle. The flying mark ends its keyframe at `opacity: 0`, so it collapses
 * to nothing rather than flashing; the toast lands instantly and is still
 * dismissed by its own timer, which is JS and unaffected.
 */

/** Must match `--animate-cart-fly`'s duration in globals.css. */
export const CART_FLY_MS = 620;

/** How long the toast stays up. Long enough to read at a glance, short enough not to sit over the grid. */
export const CART_TOAST_MS = 2200;

/** A measured rectangle, flattened to what this needs — `DOMRect` itself is not plain state. */
export type Point = { x: number; y: number };

export type CartAdd = {
  /** Bumped per add, so re-adding the same item restarts both animations. */
  id: number;
  /** "2 Sunflower seeds" or "Sunflower seeds" — whatever the card called it. */
  label: string;
  /** Centre of the cart icon. Null when no cart icon is on screen (the `xl:` layout shows the rail instead). */
  cart: Point | null;
  /** Centre of the pressed "+". Null when it could not be measured; the flight is skipped, the toast is not. */
  origin: Point | null;
};

export function CartAddOverlay({
  add,
  onDismiss,
}: {
  add: CartAdd | null;
  onDismiss: () => void;
}) {
  const id = add?.id;

  useEffect(() => {
    if (id === undefined) return;
    const timer = setTimeout(onDismiss, CART_TOAST_MS);
    return () => clearTimeout(timer);
    // Keyed on `id`, not on `add`: a fresh add restarts the countdown, but a
    // re-render that hands back an equal object must not.
  }, [id, onDismiss]);

  if (!add) return null;

  const flight =
    add.origin && add.cart
      ? { from: add.origin, dx: add.cart.x - add.origin.x, dy: add.cart.y - add.origin.y }
      : null;

  return (
    <div aria-hidden>
      {flight ? (
        <span
          // `key` is what replays the animation: without it React reuses the
          // element on the next add and a CSS animation does not restart on
          // a style change alone.
          key={add.id}
          style={{
            left: flight.from.x,
            top: flight.from.y,
            // Read back by the `cart-fly` keyframe — see globals.css.
            ["--cart-fly-x" as string]: `${flight.dx}px`,
            ["--cart-fly-y" as string]: `${flight.dy}px`,
          }}
          className={cn(
            "pointer-events-none fixed z-50 flex size-[26px] items-center justify-center rounded-full",
            "bg-terracotta text-white shadow-btn",
            "animate-cart-fly",
          )}
        >
          <Check size={14} strokeWidth={3} />
        </span>
      ) : null}

      <div
        key={`toast-${add.id}`}
        style={
          add.cart
            ? // Under the icon and right-aligned to it, clamped away from the
              // viewport edge so a cart icon near the corner does not push the
              // toast off screen.
              { top: add.cart.y + 24, right: Math.max(12, window.innerWidth - add.cart.x - 20) }
            : // No cart icon on screen: centre it at the top rather than
              // anchoring to nothing.
              { top: 16, left: "50%", transform: "translateX(-50%)" }
        }
        className={cn(
          "pointer-events-none fixed z-50 flex max-w-[min(280px,calc(100vw-24px))] items-center gap-2",
          "rounded-pill border border-border-track bg-surface py-2 pr-[14px] pl-[10px] shadow-card",
          "animate-cart-toast-in",
        )}
      >
        <span className="flex size-[22px] flex-none items-center justify-center rounded-full bg-sage text-white">
          <ShoppingCart size={12} strokeWidth={2.4} />
        </span>
        <span className="min-w-0 text-[12px] leading-tight font-bold text-ink">
          <span className="block truncate">{add.label}</span>
          <span className="block text-[11px] font-semibold text-ink-soft">Added to cart</span>
        </span>
      </div>
    </div>
  );
}

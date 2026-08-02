"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { useCartCount } from "@/components/store/cart-count-context";

/**
 * The store header's cart icon + count badge (STOR-06). Reads from
 * `CartCountContext` rather than a plain prop so `StoreItemCard`'s
 * add-to-cart button can bump it live — see that context's own doc comment
 * for why this and the grid can't just pass the count directly.
 */
export function CartLink() {
  const cart = useCartCount();
  const count = cart?.count ?? 0;

  return (
    <Link
      href="/store/cart"
      aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
      className="relative flex size-[34px] items-center justify-center rounded-full border border-border-track bg-surface text-ink-soft transition-colors duration-120 hover:border-checkbox"
    >
      <ShoppingCart size={17} strokeWidth={2} aria-hidden />
      {count > 0 ? (
        <span
          aria-hidden
          // Fixed `h-4` paired with `min-w-4`, not `min-w` alone with no
          // height — a height driven only by the 9px text's line box (as
          // this was before) isn't 16px, so the badge read as an oval with
          // off-centre text rather than a circle. Height fixed + width
          // allowed to grow (padding, not a fixed width) keeps single
          // digits a true circle and "99+" a pill with fully round ends.
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[9px] leading-none font-extrabold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

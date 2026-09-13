"use client";

import { Gift } from "lucide-react";
import Link from "next/link";

import { useCartCount } from "@/components/store/cart-count-context";
import { cn } from "@/lib/cn";

/**
 * The store header's box button (`design_handoff_lucky_boxes` §2) — the way
 * into My boxes, with the unopened count. Drawn exactly like `CartLink`
 * beside it. The count is a server prop rather than a context: buying a box
 * already `router.refresh()`es the page, which re-reads it. It registers as
 * the fly-to target for a bought box, the way `CartLink` does for the cart.
 */
export function MyBoxesLink({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const cart = useCartCount();

  return (
    <Link
      ref={cart?.registerBoxesAnchor}
      href="/store/boxes"
      aria-label={count > 0 ? `My boxes, ${count} unopened` : "My boxes"}
      className={cn(
        "relative flex size-[34px] flex-none items-center justify-center rounded-full border border-border-track bg-surface text-ink-soft transition-colors duration-120 hover:border-checkbox",
        className,
      )}
    >
      <Gift size={17} strokeWidth={2} aria-hidden />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[9px] leading-none font-extrabold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

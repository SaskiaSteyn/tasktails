import { Gift } from "lucide-react";
import Link from "next/link";

import { Coin } from "@/components/ui/coin";

/**
 * #256 reshaped this from a full-width row into one half of the store's
 * top row: the "Sell items" card moved off Profile to sit beside it
 * ("put the card next to lucky box card, there should be enough space"),
 * so both are now the same compact portrait card — well, name, price,
 * action — sized to the same footprint a `StoreItemCard` already occupies
 * in the two-column phone grid. The horizontal row it used to be does not
 * survive being halved: the 52px well plus a trailing button leaves no
 * width for the name in a 300px frame.
 *
 * GACHA-10 — the Lucky Box's entry point on the Store screen, per the
 * approved design board (`Beta/Planning/TaskTails Screens - Gacha.html`
 * §1, rev.3) rather than `design_handoff/TaskTails Screens.dc.html` (which
 * predates the gacha feature entirely). Full-width, above `StoreBrowser`'s
 * item grid, using the exact same card recipe every other `StoreItemCard`
 * uses (`rounded-card`/`border-border-track`/`bg-warm`) rather than a
 * one-off look — the design board's own "simplified to price, icon, buy
 * button, label" note is what trimmed this down from an earlier draft that
 * also carried a subtitle.
 *
 * The Group B urgency content (`GACHA-11`) used to render inside this card
 * via an `extra` slot; #256 moved it out to `StoreBrowser`, full width
 * directly beneath the two-card row. At half width the odds-boost banner's
 * headline and its countdown badge no longer fit on one line, and a
 * stimulus that has to wrap to three lines is a weaker stimulus than one
 * that spans the screen. Both study groups get the identical two-card row
 * either way — only the banner below it differs, which is the point.
 *
 * `price` arrives as a plain prop rather than importing `LUCKY_BOX_COST_
 * COINS` from `@/lib/gacha` here — this component is reachable from
 * `StoreBrowser`, a `"use client"` component, and `gacha.ts` imports Prisma
 * at module scope, which would break the browser build exactly the way
 * `item-visual.tsx`'s own doc comment describes for the same class of
 * mistake (STOR-02's Prisma-enum-import bug). `StorePage` (server) reads
 * the constant and passes it down as a number, same as it does for `level`.
 *
 * The well reuses `item-visual.tsx`'s `CATEGORY_WELL.FOOD` amber tokens
 * rather than going through `ItemWell` itself — `ItemWell` expects a real
 * `StoreItem`-shaped `{ category, imageUrl }`, and the Lucky Box isn't a
 * `StoreItem` row at all (`GACHA-03`'s seed deliberately never creates one
 * for it), so faking that shape just to borrow the styling would be more
 * indirection than the two reused class names below.
 *
 * The "Open" pill is the card's one interactive element — same "the button
 * is the tap target, not the whole row" pattern `StoreItemCard`'s own "+"
 * uses, not a wrapper `Link` around the entire card. Originally shipped
 * inert ("render the control, wire it up later", same as `STOR-01`'s own
 * then-unbuilt search/chips/cart button) because `GACHA-12` (the Lucky Box
 * home screen this opens) hadn't shipped yet; wired to `/store/lucky-box`
 * once it had — found live, 2026-08-08, still pointing nowhere after
 * `GACHA-12` existed.
 */
export function LuckyBoxCard({ price }: { price: number }) {
  return (
    <div className="flex h-full flex-col rounded-card border border-border-track bg-warm p-[11px]">
      <div className="flex size-[44px] flex-none items-center justify-center rounded-[11px] bg-amber-tint">
        <Gift size={22} strokeWidth={2} className="text-amber-text" aria-hidden />
      </div>

      <p className="mt-[9px] text-[13px] font-extrabold">Lucky Box</p>
      <span className="mt-[3px] mb-[11px] flex items-center gap-[3px]">
        <Coin size={12} />
        <span className="text-[12px] font-extrabold text-amber-text">
          {/* Locale pinned explicitly — see `coin.tsx`'s `CoinPill` for the hydration mismatch this avoids. */}
          {price.toLocaleString("en-US")}
        </span>
      </span>

      {/* `mt-auto`: the two cards in this row stretch to a shared height, and
          their buttons line up with each other rather than each floating
          under its own copy. */}
      <Link
        href="/store/lucky-box"
        className="mt-auto flex h-[32px] items-center justify-center rounded-[10px] bg-terracotta font-display text-[12.5px] font-semibold text-white hover:bg-terracotta-hover"
      >
        Open
      </Link>
    </div>
  );
}

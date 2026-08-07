import { Gift } from "lucide-react";
import type { ReactNode } from "react";

import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";

/**
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
 * `extra` (`GACHA-11`) is the Group B urgency content — the odds-boost
 * countdown banner plus the "N opened in the last hour" line — rendered
 * beneath the base row when present. A `ReactNode` slot, not a boolean or
 * the raw urgency data, same reasoning `StoreBrowser`'s own `flashSaleBanner`
 * prop documents: `StorePage` is the only place that ever knows the study
 * group, and it decides the *entire* extra subtree server-side (or `null`)
 * before handing it down, so this component (and `StoreBrowser`, which just
 * passes it through) never contains a single line of group-conditional
 * logic itself.
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
 * **Inert for now, on purpose** — same "render the control, wire it up
 * later" pattern `STOR-01` used for its own then-unbuilt search/chips/cart
 * button: there is nowhere to link to yet, since `GACHA-12` (the Lucky Box
 * home screen this would open) hasn't shipped.
 */
export function LuckyBoxCard({
  price,
  extra,
}: {
  price: number;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-[11px] w-full rounded-card border border-border-track bg-warm px-[11px] py-3">
      <div className={cn("flex items-center gap-3", extra ? "mb-[9px]" : undefined)}>
        <div className="flex size-[52px] flex-none items-center justify-center rounded-[11px] bg-amber-tint">
          <Gift size={24} strokeWidth={2} className="text-amber-text" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-extrabold">Lucky Box</p>
          <span className="mt-1 flex items-center gap-[3px]">
            <Coin size={12} />
            <span className="text-[12px] font-extrabold text-amber-text">
              {/* Locale pinned explicitly — see `coin.tsx`'s `CoinPill` for the hydration mismatch this avoids. */}
              {price.toLocaleString("en-US")}
            </span>
          </span>
        </div>

        <span className="flex-none rounded-[10px] bg-terracotta px-4 py-2 font-display text-[12.5px] font-semibold text-white">
          Open
        </span>
      </div>

      {extra}
    </div>
  );
}

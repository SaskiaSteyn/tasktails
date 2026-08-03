/**
 * URG-02 — the Group B "Only X left!" stock-depletion badge, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Store — Group B" frame (pin
 * 2): a small pill pinned to the card's top-right corner. Not a client
 * component — unlike `FlashSaleBanner` (URG-01) this has no ticking state, so
 * there's nothing that needs `"use client"`, and rendering it fully
 * server-side means zero extra JS ships for this feature.
 *
 * Only ever constructed by `StorePage` (`src/app/store/page.tsx`) inside a
 * `groupGatedData()` check, one element per unlocked item, and handed down
 * through `StoreBrowser`/`StoreItemCard` as an inert slot — same pattern
 * `flashSaleBanner` established, so the study group itself never has to
 * reach client code for this ticket either.
 */
export function StockBadge({ stock }: { stock: number }) {
  return (
    <span className="absolute right-2 top-2 z-10 rounded-pill bg-urgency px-[7px] py-[2px] text-[9px] font-extrabold text-white">
      Only {stock} left!
    </span>
  );
}

/**
 * URG-02 — the Group B "Only X left!" stock-depletion badge, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Store — Group B" frame (pin
 * 2). Not a client component — unlike `FlashSaleBanner` (URG-01) this has no
 * ticking state, so nothing needs `"use client"`, and rendering it fully
 * server-side means zero extra JS ships for this feature.
 *
 * Not self-positioned — `StoreItemCard`'s single absolute top-right wrapper
 * owns that now (URG-03), since an item can carry this badge, the
 * `CartActivityBadge`, or both stacked, and only one element should be
 * `position: absolute` for that stack to lay out predictably.
 *
 * Only ever constructed by `StorePage` (`src/app/store/page.tsx`) inside a
 * `groupGatedData()` check, one element per unlocked item, and handed down
 * through `StoreBrowser`/`StoreItemCard` as an inert slot — same pattern
 * `flashSaleBanner` established, so the study group itself never has to
 * reach client code for this ticket either.
 */
export function StockBadge({ stock }: { stock: number }) {
  return (
    <span className="rounded-pill bg-urgency px-[7px] py-[2px] text-[9px] font-extrabold text-white">
      Only {stock} left!
    </span>
  );
}

/**
 * `design_handoff/ADDENDUM-store-zoo-art.md`'s Group-B "Buy 1 get 1" corner
 * badge (violet `#8478C4`, matching `--color-violet` exactly) — the Red
 * collar's curated urgency treatment, alongside `StockBadge`/
 * `CartActivityBadge`. Static, unlike `BundleTimerBadge`'s own "Buy 2 get 1
 * · MM:SS": the addendum's mock draws no countdown on this one.
 *
 * Purely decorative, like every other Group-B urgency stimulus (§4) —
 * checkout applies no actual buy-one-get-one discount.
 */
export function BuyOneGetOneBadge() {
  return (
    <span className="rounded-pill bg-violet px-[7px] py-[2px] text-[9px] font-extrabold text-white">
      Buy 1 get 1
    </span>
  );
}

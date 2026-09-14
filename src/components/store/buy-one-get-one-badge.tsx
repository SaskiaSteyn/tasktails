/**
 * `design_handoff/ADDENDUM-store-zoo-art.md`'s Group-B "Buy 1 get 1" corner
 * badge (violet `#8478C4`, matching `--color-violet` exactly) — the Red
 * collar's curated urgency treatment, alongside `StockBadge`/
 * `CartActivityBadge`. Static, unlike `BundleTimerBadge`'s own "Buy 2 get 1
 * · MM:SS": the addendum's mock draws no countdown on this one.
 *
 * #300 — unlike every other Group-B urgency stimulus (§4), this one is real:
 * the card's "+" adds two and checkout charges one (`lineCost()`,
 * `dealsForUser()`). The cart panel reuses this pill to tag multibuy lines,
 * with `buy={2}` for a "Buy 2 get 1".
 */
export function BuyOneGetOneBadge({ buy = 1 }: { buy?: number }) {
  return (
    <span className="whitespace-nowrap rounded-pill bg-violet px-[7px] py-[2px] text-[9px] font-extrabold text-white">
      Buy {buy} get 1
    </span>
  );
}

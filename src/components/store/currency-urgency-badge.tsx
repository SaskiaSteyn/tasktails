/**
 * URG-07 — the Group B currency-based urgency note, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Store — Group B" frame (pin
 * 7): "Double XP this hour only" on an urgency-red pill. Matches the mock's
 * own copy verbatim, over the ticket's two looser examples ("Double XP for
 * purchases this hour only" / "Bonus coins if bought before midnight") —
 * design_handoff is the authoritative visual source per AGENTS.md, same
 * precedent URG-05/URG-06 already established for fixed-copy urgency notes.
 *
 * Static text, no ticking state and no props — unlike `BundleTimerBadge`
 * (URG-06), the mock draws no MM:SS countdown alongside this one, so there's
 * nothing to compute. Not a client component, rendered fully server-side.
 *
 * Purely decorative, like every other Group B urgency stimulus (§4: "there
 * is no real stock, real social activity, or real deadline") — no checkout
 * or economy logic actually doubles XP for a purchase made while this shows.
 *
 * Shares `StoreItemCard`'s `note` slot with `RecentPurchasesBadge`
 * (URG-04), `UrgencyLanguageNote` (URG-05) and `BundleTimerBadge` (URG-06) —
 * `urgencyDataForItems()`'s `noteSelection` seed (URG-08) grew to a 5-way
 * pick to keep all four mutually exclusive, same pattern as URG-06's own
 * extension.
 */
export function CurrencyUrgencyBadge() {
  return (
    <p className="mb-[7px] mt-[2px] inline-block rounded-[7px] bg-urgency px-[6px] py-[3px] text-[9px] font-extrabold text-white">
      Double XP this hour only
    </p>
  );
}

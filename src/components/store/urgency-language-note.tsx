/**
 * URG-05 — the Group B urgency-language note, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Store — Group B" frame (pin
 * 5). Fixed copy, matching the mock verbatim rather than rotating through
 * Requirements.md §4.2's wider phrase taxonomy — confirmed with the user;
 * the mock is the one place this ticket's exact wording is grounded, and the
 * other phrases in §4.2 aren't part of the 7 prioritised patterns.
 *
 * No icon, unlike `RecentPurchasesBadge` — the mock draws this as plain text,
 * matching the ticket's own "text" wording (not "badge"/"indicator").
 *
 * **Relocated 2026-08-25 (#202, "labels are all over the place")**:
 * originally rendered in a second card slot below the category label — the
 * one place in the whole card that wasn't drawn anywhere in `design_handoff`
 * (only the corner badges and the above-the-price line are real). A first
 * attempt at this fix moved it into the top-right corner instead, which
 * turned out to be just as wrong the other way (screenshotted live: a
 * corner-badge-shaped pill with this much text reads as a banner smeared
 * across the art, not a small "Only 3 left!"-style tag). It now renders
 * through `StoreItemCard`'s `footerNote` slot — below the image, above the
 * price row, sharing `RecentPurchasesBadge`'s spot exactly as the mock's own
 * "Red collar" card draws it. Styling is unchanged from before either fix:
 * plain coloured text, no pill.
 *
 * Still mutually exclusive with `BundleTimerBadge` (URG-06) and
 * `CurrencyUrgencyBadge` (URG-07) — `urgencyDataForItems()`'s
 * `noteSelection` seed (URG-08) guarantees at most one of the three is ever
 * passed down, so this component has no awareness of the others.
 */
export function UrgencyLanguageNote() {
  return (
    <p className="mb-[7px] mt-[2px] text-[9.5px] font-extrabold text-urgency">
      Last chance — don&rsquo;t miss out!
    </p>
  );
}

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
 * Shares `StoreItemCard`'s `note` slot with `RecentPurchasesBadge` (URG-04)
 * but the two are mutually exclusive per item — `urgencyDataForItems()`'s
 * `noteSelection` seed (URG-08) guarantees at most one is ever passed down,
 * so this component has no awareness of the other.
 */
export function UrgencyLanguageNote() {
  return (
    <p className="mb-[7px] mt-[2px] text-[9.5px] font-extrabold text-urgency">
      Last chance — don&rsquo;t miss out!
    </p>
  );
}

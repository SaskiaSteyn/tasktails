/**
 * URG-07 — the Group B currency-based urgency note, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Store — Group B" frame (pin
 * 7): "Double XP this hour only" on an urgency-red pill. Matches the mock's
 * own copy verbatim, over the ticket's two looser examples ("Double XP for
 * purchases this hour only" / "Bonus coins if bought before midnight") —
 * design_handoff is the authoritative visual source per AGENTS.md, same
 * precedent URG-05/URG-06 already established for fixed-copy urgency notes.
 *
 * Static text, no ticking state — unlike `BundleTimerBadge` (URG-06), the
 * mock draws no MM:SS countdown alongside this one, so there's nothing to
 * compute. Not a client component, rendered fully server-side.
 *
 * Purely decorative, like every other Group B urgency stimulus (§4: "there
 * is no real stock, real social activity, or real deadline") — no checkout
 * or economy logic actually doubles XP for a purchase made while this shows.
 *
 * Two positions, both real — this is the one urgency component that
 * genuinely earns an `overlay` prop rather than needing a fix to remove it:
 * `overlay` (`ADDENDUM-store-zoo-art.md`'s curated Hearts card only, wired by
 * `StorePage`) is the small `rounded-pill` treatment aligned with the other
 * corner badges, per the addendum's art (drawn top-centred there; the user
 * asked for it aligned with the other cards' corner badges instead,
 * 2026-08-18). The default (every other Group-B item, via `noteSelection`)
 * renders through `StoreItemCard`'s `footerNote` slot instead, below the
 * image and above the price — **relocated there 2026-08-25 (#202, "labels
 * are all over the place")** from a second header slot `design_handoff`
 * never actually drew; a first attempt at that fix put the default variant
 * in the corner too, which read as a banner smeared across the art once the
 * pill had this much text in it (confirmed live via screenshot) rather than
 * a small "Only 3 left!"-style tag. Still mutually exclusive with
 * `UrgencyLanguageNote` (URG-05) and `BundleTimerBadge` (URG-06) —
 * `urgencyDataForItems()`'s `noteSelection` seed (URG-08) guarantees at most
 * one of the three is ever passed down.
 */
export function CurrencyUrgencyBadge({ overlay = false }: { overlay?: boolean }) {
  return (
    <p
      className={
        overlay
          ? "rounded-pill bg-urgency px-[7px] py-[2px] text-[9px] font-extrabold text-white"
          : "mb-[7px] mt-[2px] inline-block rounded-[7px] bg-urgency px-[6px] py-[3px] text-[9px] font-extrabold text-white"
      }
    >
      Double XP this hour only!
    </p>
  );
}

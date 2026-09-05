import { createHash } from "node:crypto";

/**
 * URG-08 — fabricated urgency values for the Group B store (Requirements.md
 * §4). `groupGatedData()` (INF-17, `study-group.ts`) is what decides *whether*
 * these are ever computed for a request; this module only decides *what
 * number* to fabricate once that gate has already said yes, so it has no
 * knowledge of the study group itself.
 *
 * Issue #187 — every seeded value below now rotates once per UTC day (the
 * `date` argument threaded through `seededInt`), so a participant sees a
 * fresh urgency mix each day instead of habituating to a permanent one. The
 * two countdown timers (`FlashSaleBanner` URG-01, `BundleTimerBadge` URG-06)
 * already re-randomise per page load and are unaffected.
 *
 * Covers `stock` (URG-02), `cartActivity` (URG-03), `recentPurchases`
 * (URG-04) and the note-slot selection driving URG-05/URG-06 so far, not the
 * full "stock counts, viewer counts, sale timers" URG-08's own summary
 * lists. URG-01 is self-contained per its own "resets on page load" wording
 * (confirmed with the user) so it needs no data from here; URG-06's own
 * countdown is the same kind of self-contained client-side timer
 * (`BundleTimerBadge`), but *whether* an item gets offered the bundle deal
 * at all still needs a stable per-item decision, which is what
 * `noteSelection` provides.
 *
 * `badgeSelection` (URG-03) decides which of the two *corner* badges
 * (`StockBadge`/`CartActivityBadge`) an item shows. Originally allowed both
 * at once (matching how `noteSelection` started out allowing "neither"), but
 * the user asked afterwards to make this slot mutually exclusive too, like
 * every note-slot ticket already was — exactly one of the two always shows,
 * never both, never neither (2026-08-04, after all 7 frontend URG tickets
 * had shipped).
 *
 * `noteSelection` (URG-05, extended by URG-06 and URG-07) picks among four
 * mutually-exclusive extra stimuli, independent of `badgeSelection`. All four
 * render below the image and above the price (`StorePage`'s
 * `urgencyFooterNotes` map, `StoreItemCard`'s `footerNote` slot) — briefly,
 * between 2026-08-25's two attempts at issue #202, three of them (urgency-
 * language, bundle-timer, currency-urgency) lived in the top-right corner
 * stack alongside `badgeSelection`'s pick instead, which turned out to be
 * exactly the wrong fix once screenshotted: a corner-badge-shaped pill with
 * this much text reads as a banner smeared across the art. Placement is a
 * rendering concern for `StorePage`/`StoreItemCard`; this module only
 * decides which stimulus, if any, an item gets. Mutual exclusivity across
 * all four (unlike the corner badges' own stock/cart-activity pick) is
 * unchanged by any of that — several full sentences/pills at once reads as
 * too crowded for a 172px card either way: 0 = none, 1 = recent-purchases,
 * 2 = urgency-language, 3 = bundle-timer, 4 = currency-urgency. "None" stays
 * a possible outcome, preserving URG-04's own already-confirmed "can be
 * absent entirely" behaviour — only "more than one at once" is ruled out.
 */

type UrgencyKind =
  | "stock"
  | "cartActivity"
  | "badgeSelection"
  | "recentPurchases"
  | "noteSelection";

/** The UTC calendar day `date` falls on (`"2026-08-31"`) — the daily-rotation bucket, #187. */
function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * A hash of `(userId, itemId, kind, utcDay)`, not `Math.random()` — the same
 * user sees the same fabricated value for the same item on every request
 * *within one UTC calendar day*, with no database row or cache needed to make
 * that true.
 *
 * The `utcDay` component is issue #187 ("swap out the urgency so users don't
 * habituate to it"): every seeded value — the stock/cart counts, which corner
 * badge an item shows, which footer note it shows — reshuffles at 00:00 UTC
 * and then holds steady until the next rollover, so a participant sees a
 * different urgency mix each day but never a flickering one within a session.
 * `date` defaults to now and is a parameter only so the rotation stays a pure
 * function of its input and can be tested against two fixed days.
 *
 * Exported (GACHA-09) for `gacha.ts`'s own fabricated urgency value — the
 * Lucky Box isn't a `StoreItem` row, but the same "no DB row, no cache,
 * stable per (user, pseudo-id, day)" reasoning applies, so it reuses this
 * rather than a second hashing implementation, and its "N opened in the last
 * hour" number rotates daily too, by design (#187).
 */
export function seededInt(
  userId: string,
  itemId: string,
  kind: UrgencyKind,
  min: number,
  max: number,
  date: Date = new Date(),
): number {
  const hash = createHash("sha256")
    .update(`${userId}:${itemId}:${kind}:${utcDayKey(date)}`)
    .digest();
  return min + (hash.readUInt32BE(0) % (max - min + 1));
}

export type ItemUrgencyData = {
  itemId: string;
  /** URG-02 — "Only X left!". Range 1–5, confirmed with the user. */
  stock: number;
  /** URG-03 — "N in carts". Range 2–9, confirmed with the user. */
  cartActivity: number;
  /**
   * Mutually exclusive — exactly one of these two is always true, never both,
   * never neither. Both derive from the same `badgeSelection` seed.
   */
  showStockBadge: boolean;
  showCartActivityBadge: boolean;
  /**
   * URG-04 — "X sold in the last hour". Range 3–7, confirmed with the user
   * (deliberately narrower than URG-02/URG-03's ranges — the study only has
   * 20 participants, so "8 sold" reads as implausible for this catalogue).
   */
  recentPurchases: number;
  /**
   * Mutually exclusive with `showUrgencyLanguage`/`showBundleTimer`/
   * `showCurrencyUrgency` — all four derive from the same `noteSelection`
   * seed, so at most one is ever true.
   */
  showRecentPurchases: boolean;
  /** URG-05 — the fixed "Last chance — don't miss out!" note. See above. */
  showUrgencyLanguage: boolean;
  /**
   * URG-06 — whether this item gets offered `<BundleTimerBadge />`. The
   * countdown value itself isn't fabricated here (it's a self-contained
   * client-side timer, same as URG-01's), only whether the item is eligible
   * for the offer at all.
   */
  showBundleTimer: boolean;
  /** URG-07 — the fixed "Double XP this hour only" note. See above. */
  showCurrencyUrgency: boolean;
};

/**
 * `design_handoff/ADDENDUM-store-zoo-art.md`'s Group-B fake discount, as
 * revised by issue #185 ("inflate the price, cross it out, sell it for the
 * price that group A sees"): the bold "sale" price is now *exactly* the real
 * `coinPrice` — the same number Group A pays — and the struck-through "list"
 * price is that inflated 20%. There is no real markdown; only the struck
 * number is fabricated. (The addendum's earlier rule inflated `coinPrice` and
 * then took 20% back off, netting *approximately* the real price — #185
 * pins it to the real price instead, so the addendum's own 48/38-style table
 * is now stale.)
 *
 * `units` (#185, "Buy 2 get 1") — for a `BundleTimerBadge` item the card
 * shows the two-unit figure: `fakeDiscountPricing(coinPrice, 2)` → `sale` is
 * two units at the real price, `list` that inflated 20%. `StoreItemCard`'s
 * "+" then adds two units at once and checkout charges `coinPrice` × 2 for
 * two items — no third item is ever granted, the "get 1" is copy only.
 *
 * Still a display-layer fabrication for the per-unit price, like every other
 * Group-B urgency stimulus (§4): checkout charges `coinPrice` per unit, never
 * `list`/`sale` — nothing in `cart.ts`/`checkout` reads this. The only
 * behavioural change #185 makes is the two-unit add quantity, carried by
 * `StoreItemCard`'s `addQuantity` prop, not by this module.
 */
export function fakeDiscountPricing(
  basePrice: number,
  units: number = 1,
): { list: number; sale: number } {
  const sale = basePrice * units;
  const list = Math.round(sale * 1.2);
  return { list, sale };
}

/**
 * One fabricated row per item in `itemIds`, seeded against `userId` and the
 * UTC day of `date` (defaults to now). Every value rotates at 00:00 UTC —
 * see `seededInt` (#187).
 */
export function urgencyDataForItems(
  userId: string,
  itemIds: string[],
  date: Date = new Date(),
): ItemUrgencyData[] {
  return itemIds.map((itemId) => {
    // 0 = stock only, 1 = cart-activity only.
    const badgeSelection = seededInt(userId, itemId, "badgeSelection", 0, 1, date);
    // 0 = neither note, 1 = recent-purchases, 2 = urgency-language,
    // 3 = bundle-timer, 4 = currency-urgency.
    const noteSelection = seededInt(userId, itemId, "noteSelection", 0, 4, date);

    return {
      itemId,
      stock: seededInt(userId, itemId, "stock", 1, 5, date),
      cartActivity: seededInt(userId, itemId, "cartActivity", 2, 9, date),
      showStockBadge: badgeSelection === 0,
      showCartActivityBadge: badgeSelection === 1,
      recentPurchases: seededInt(userId, itemId, "recentPurchases", 3, 7, date),
      showRecentPurchases: noteSelection === 1,
      showUrgencyLanguage: noteSelection === 2,
      showBundleTimer: noteSelection === 3,
      showCurrencyUrgency: noteSelection === 4,
    };
  });
}

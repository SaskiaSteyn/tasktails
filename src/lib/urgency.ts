import { createHash } from "node:crypto";

/**
 * URG-08 — fabricated urgency values for the Group B store (Requirements.md
 * §4). `groupGatedData()` (INF-17, `study-group.ts`) is what decides *whether*
 * these are ever computed for a request; this module only decides *what
 * number* to fabricate once that gate has already said yes, so it has no
 * knowledge of the study group itself.
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
 * `noteSelection` (URG-05, extended by URG-06 and URG-07) is the equivalent
 * for the card's second slot — the inline line below the category label.
 * URG-04 shipped `showRecentPurchases` as an independent coin flip; URG-05's
 * own text ("Last chance — don't miss out!") lives in that exact same slot,
 * and the user chose *mutual exclusivity* here (unlike the corner badges'
 * "both allowed" — several full sentences/pills stacked read as too crowded
 * for a 172px card). URG-06's bundle-timer pill and URG-07's currency-urgency
 * pill both landed in the same slot too (the design mock draws all four in
 * the identical position), so `noteSelection` grew again rather than adding
 * a separate rule each time: 0 = neither note, 1 = recent-purchases,
 * 2 = urgency-language, 3 = bundle-timer, 4 = currency-urgency. "Neither"
 * stays a possible outcome, preserving URG-04's own already-confirmed "can
 * be absent entirely" behaviour — only "more than one at once" is ruled out.
 */

type UrgencyKind =
  | "stock"
  | "cartActivity"
  | "badgeSelection"
  | "recentPurchases"
  | "noteSelection";

/**
 * A hash of `(userId, itemId, kind)`, not `Math.random()` — the same user
 * sees the same fabricated value for the same item on every request, with no
 * database row or cache needed to make that true. Stable for as long as the
 * user and item exist, which satisfies "seeded ... per item per session"
 * (confirmed with the user) at least as strongly as a session-scoped value
 * would.
 *
 * Exported (GACHA-09) for `gacha.ts`'s own fabricated urgency value — the
 * Lucky Box isn't a `StoreItem` row, but the same "no DB row, no cache,
 * stable per (user, pseudo-id)" reasoning applies, so it reuses this rather
 * than a second hashing implementation.
 */
export function seededInt(
  userId: string,
  itemId: string,
  kind: UrgencyKind,
  min: number,
  max: number,
): number {
  const hash = createHash("sha256").update(`${userId}:${itemId}:${kind}`).digest();
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
 * `design_handoff/ADDENDUM-store-zoo-art.md`'s Group-B fake discount —
 * struck-through "list" price inflated 20% above the real `coinPrice`, and a
 * bold "sale" price 20% off that inflated number, netting back to
 * approximately (not exactly, thanks to rounding) the real price. Purely a
 * display-layer fabrication, like every other Group-B urgency stimulus (§4):
 * checkout still charges `coinPrice` itself, never `sale` — nothing in
 * `cart.ts`/`checkout` route reads this.
 */
export function fakeDiscountPricing(basePrice: number): { list: number; sale: number } {
  const list = Math.round(basePrice * 1.2);
  const sale = Math.round(list * 0.8);
  return { list, sale };
}

/** One fabricated row per item in `itemIds`, seeded against `userId`. */
export function urgencyDataForItems(
  userId: string,
  itemIds: string[],
): ItemUrgencyData[] {
  return itemIds.map((itemId) => {
    // 0 = stock only, 1 = cart-activity only.
    const badgeSelection = seededInt(userId, itemId, "badgeSelection", 0, 1);
    // 0 = neither note, 1 = recent-purchases, 2 = urgency-language,
    // 3 = bundle-timer, 4 = currency-urgency.
    const noteSelection = seededInt(userId, itemId, "noteSelection", 0, 4);

    return {
      itemId,
      stock: seededInt(userId, itemId, "stock", 1, 5),
      cartActivity: seededInt(userId, itemId, "cartActivity", 2, 9),
      showStockBadge: badgeSelection === 0,
      showCartActivityBadge: badgeSelection === 1,
      recentPurchases: seededInt(userId, itemId, "recentPurchases", 3, 7),
      showRecentPurchases: noteSelection === 1,
      showUrgencyLanguage: noteSelection === 2,
      showBundleTimer: noteSelection === 3,
      showCurrencyUrgency: noteSelection === 4,
    };
  });
}

import { createHash } from "node:crypto";

/**
 * URG-08 — fabricated urgency values for the Group B store (Requirements.md
 * §4). `groupGatedData()` (INF-17, `study-group.ts`) is what decides *whether*
 * these are ever computed for a request; this module only decides *what
 * number* to fabricate once that gate has already said yes, so it has no
 * knowledge of the study group itself.
 *
 * Covers `stock` (URG-02), `cartActivity` (URG-03), `recentPurchases`
 * (URG-04) and the urgency-language note (URG-05) so far, not the full
 * "stock counts, viewer counts, sale timers" URG-08's own summary lists.
 * URG-01 and URG-06 (the two timers) are self-contained per their own
 * "resets on page load" wording — confirmed for URG-01, and URG-06 reads the
 * same way — so neither needs data from here.
 *
 * `badgeSelection` (URG-03) decides which of the two *corner* badges
 * (`StockBadge`/`CartActivityBadge`) an item shows, confirmed with the user:
 * the design mock's own "Store — Group B" frame only ever draws one urgency
 * badge per card (each of its four example cards demonstrates a different
 * pattern), but nothing stops the same item having both stock and
 * cart-activity data once both tickets exist — so something has to decide
 * layout once real cards can carry either or both. Per the user: every
 * unlocked item shows at least one of the two, and some show both stacked in
 * the same top-right corner (`StoreItemCard`'s wrapper).
 *
 * `noteSelection` (URG-05) is the equivalent for the card's second slot —
 * the inline line below the category label. URG-04 shipped `showRecentPurchases`
 * as an independent coin flip; URG-05's own text ("Last chance — don't miss
 * out!") lives in that exact same slot, and the user chose *mutual
 * exclusivity* here (unlike the corner badges' "both allowed" — two full
 * sentences stacked read as too crowded for a 172px card). `noteSelection`
 * replaces the old independent flip: 0 = neither note, 1 = recent-purchases,
 * 2 = urgency-language. "Neither" stays a possible outcome, preserving
 * URG-04's own already-confirmed "can be absent entirely" behaviour — only
 * the "both at once" case was ruled out.
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
 */
function seededInt(
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
   * At least one of these two is always true — an item is never handed down
   * with neither badge selected. Independent seeded coin flips rather than a
   * single three-way pick: simpler, and the "both false" outcome is just
   * re-rolled rather than needing a fourth case to reject.
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
   * Mutually exclusive with `showUrgencyLanguage` — both derive from the
   * same `noteSelection` seed, so at most one is ever true. Either, neither,
   * but never both.
   */
  showRecentPurchases: boolean;
  /** URG-05 — the fixed "Last chance — don't miss out!" note. See above. */
  showUrgencyLanguage: boolean;
};

/** One fabricated row per item in `itemIds`, seeded against `userId`. */
export function urgencyDataForItems(
  userId: string,
  itemIds: string[],
): ItemUrgencyData[] {
  return itemIds.map((itemId) => {
    // 0 = stock only, 1 = cart-activity only, 2 = both.
    const badgeSelection = seededInt(userId, itemId, "badgeSelection", 0, 2);
    // 0 = neither note, 1 = recent-purchases, 2 = urgency-language.
    const noteSelection = seededInt(userId, itemId, "noteSelection", 0, 2);

    return {
      itemId,
      stock: seededInt(userId, itemId, "stock", 1, 5),
      cartActivity: seededInt(userId, itemId, "cartActivity", 2, 9),
      showStockBadge: badgeSelection === 0 || badgeSelection === 2,
      showCartActivityBadge: badgeSelection === 1 || badgeSelection === 2,
      recentPurchases: seededInt(userId, itemId, "recentPurchases", 3, 7),
      showRecentPurchases: noteSelection === 1,
      showUrgencyLanguage: noteSelection === 2,
    };
  });
}

import { createHash } from "node:crypto";

/**
 * URG-08 — fabricated urgency values for the Group B store (Requirements.md
 * §4). `groupGatedData()` (INF-17, `study-group.ts`) is what decides *whether*
 * these are ever computed for a request; this module only decides *what
 * number* to fabricate once that gate has already said yes, so it has no
 * knowledge of the study group itself.
 *
 * Covers `stock` (URG-02), `cartActivity` (URG-03) and `recentPurchases`
 * (URG-04) so far, not the full "stock counts, viewer counts, sale timers"
 * URG-08's own summary lists. URG-01 and URG-06 (the two timers) are
 * self-contained per their own "resets on page load" wording — confirmed for
 * URG-01, and URG-06 reads the same way — so neither needs data from here.
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
 * `showRecentPurchases` (URG-04) is a separate, independent seeded coin flip
 * — the "X sold in the last hour" line lives in a different card slot (below
 * the category label, not the corner badges), so it doesn't compete with
 * `badgeSelection` for space and isn't tied to its outcome. Confirmed with
 * the user: unlike the two corner badges, this one is allowed to not appear
 * on an item at all.
 */

type UrgencyKind =
  | "stock"
  | "cartActivity"
  | "badgeSelection"
  | "recentPurchases"
  | "showRecentPurchases";

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
  /** Independent of `showStockBadge`/`showCartActivityBadge` — see above. */
  showRecentPurchases: boolean;
};

/** One fabricated row per item in `itemIds`, seeded against `userId`. */
export function urgencyDataForItems(
  userId: string,
  itemIds: string[],
): ItemUrgencyData[] {
  return itemIds.map((itemId) => {
    // 0 = stock only, 1 = cart-activity only, 2 = both.
    const selection = seededInt(userId, itemId, "badgeSelection", 0, 2);

    return {
      itemId,
      stock: seededInt(userId, itemId, "stock", 1, 5),
      cartActivity: seededInt(userId, itemId, "cartActivity", 2, 9),
      showStockBadge: selection === 0 || selection === 2,
      showCartActivityBadge: selection === 1 || selection === 2,
      recentPurchases: seededInt(userId, itemId, "recentPurchases", 3, 7),
      showRecentPurchases: seededInt(userId, itemId, "showRecentPurchases", 0, 1) === 1,
    };
  });
}

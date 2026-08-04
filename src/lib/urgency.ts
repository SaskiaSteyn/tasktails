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
 * (`StockBadge`/`CartActivityBadge`) an item shows, confirmed with the user:
 * the design mock's own "Store — Group B" frame only ever draws one urgency
 * badge per card (each of its four example cards demonstrates a different
 * pattern), but nothing stops the same item having both stock and
 * cart-activity data once both tickets exist — so something has to decide
 * layout once real cards can carry either or both. Per the user: every
 * unlocked item shows at least one of the two, and some show both stacked in
 * the same top-right corner (`StoreItemCard`'s wrapper).
 *
 * `noteSelection` (URG-05, extended by URG-06) is the equivalent for the
 * card's second slot — the inline line below the category label. URG-04
 * shipped `showRecentPurchases` as an independent coin flip; URG-05's own
 * text ("Last chance — don't miss out!") lives in that exact same slot, and
 * the user chose *mutual exclusivity* here (unlike the corner badges' "both
 * allowed" — two full sentences/pills stacked read as too crowded for a
 * 172px card). URG-06's bundle-timer pill landed in the same slot too
 * (confirmed with the user), so `noteSelection` grew a fourth outcome rather
 * than a separate rule: 0 = neither note, 1 = recent-purchases,
 * 2 = urgency-language, 3 = bundle-timer. "Neither" stays a possible
 * outcome, preserving URG-04's own already-confirmed "can be absent
 * entirely" behaviour — only "more than one at once" is ruled out.
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
   * Mutually exclusive with `showUrgencyLanguage`/`showBundleTimer` — all
   * three derive from the same `noteSelection` seed, so at most one is ever
   * true.
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
};

/** One fabricated row per item in `itemIds`, seeded against `userId`. */
export function urgencyDataForItems(
  userId: string,
  itemIds: string[],
): ItemUrgencyData[] {
  return itemIds.map((itemId) => {
    // 0 = stock only, 1 = cart-activity only, 2 = both.
    const badgeSelection = seededInt(userId, itemId, "badgeSelection", 0, 2);
    // 0 = neither note, 1 = recent-purchases, 2 = urgency-language, 3 = bundle-timer.
    const noteSelection = seededInt(userId, itemId, "noteSelection", 0, 3);

    return {
      itemId,
      stock: seededInt(userId, itemId, "stock", 1, 5),
      cartActivity: seededInt(userId, itemId, "cartActivity", 2, 9),
      showStockBadge: badgeSelection === 0 || badgeSelection === 2,
      showCartActivityBadge: badgeSelection === 1 || badgeSelection === 2,
      recentPurchases: seededInt(userId, itemId, "recentPurchases", 3, 7),
      showRecentPurchases: noteSelection === 1,
      showUrgencyLanguage: noteSelection === 2,
      showBundleTimer: noteSelection === 3,
    };
  });
}

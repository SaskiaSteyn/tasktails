import { createHash } from "node:crypto";

/**
 * URG-08 — fabricated urgency values for the Group B store (Requirements.md
 * §4). `groupGatedData()` (INF-17, `study-group.ts`) is what decides *whether*
 * these are ever computed for a request; this module only decides *what
 * number* to fabricate once that gate has already said yes, so it has no
 * knowledge of the study group itself.
 *
 * Deliberately scoped to `stock` only (URG-02) for now, not the full "stock
 * counts, viewer counts, sale timers" URG-08's own summary lists. URG-01 and
 * URG-06 (the two timers) are self-contained per their own "resets on page
 * load" wording — confirmed for URG-01, and URG-06 reads the same way — so
 * neither needs data from here. URG-03/URG-04's counts do need this module,
 * but their numeric ranges haven't been confirmed with the user the way
 * URG-02's 1–5 has, and inventing ranges for tickets nobody has asked for yet
 * would be exactly the kind of unconfirmed requirement CLAUDE.behavior.md
 * says to avoid. Add a `cartActivity`/`recentPurchases` kind here — same
 * `seededInt` call, new range — when those tickets are actually taken up.
 */

type UrgencyKind = "stock";

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
};

/** One fabricated row per item in `itemIds`, seeded against `userId`. */
export function urgencyDataForItems(
  userId: string,
  itemIds: string[],
): ItemUrgencyData[] {
  return itemIds.map((itemId) => ({
    itemId,
    stock: seededInt(userId, itemId, "stock", 1, 5),
  }));
}

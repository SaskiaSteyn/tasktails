/**
 * What one feed does, by the food's rarity — split out of `pets.ts` so the
 * feed sheet can show it before the participant spends anything, the same
 * reason `sell-value.ts` exists apart from `sell.ts` (both of those import
 * Prisma and can't cross into the browser bundle). `pets.ts` re-exports
 * `FEED_EFFECT`, so server callers keep importing it from there.
 *
 * **Every food used to do exactly the same thing** — a flat `hunger −18 /
 * happiness +4`, whatever it cost. A 950-coin Epic Shrimp fed a pet no
 * better than 30-coin Hay, which made the entire top of the food catalogue
 * a strictly worse buy than the bottom of it: 31× the price for identical
 * effect. Raised by the user 2026-09-09 ("do the more expensive food fill up
 * the pet more?" — they did not) and fixed here.
 *
 * The effect had to grow *and* the prices had to come down, because both
 * stats are capped at 100: one feed can never be worth 950 coins when the
 * whole bar it fills is worth ~5 Hay. So `prisma/seed.ts` reprices food to
 * match this table, on a ladder where the coins-per-hunger-point strictly
 * improves with rarity — every Epic is better value than every Rare, which
 * is better value than every Common:
 *
 * ```
 *   Hay        30 / 18  = 1.67   worst value, cheapest entry
 *   Treat box  66 / 45  = 1.47
 *   Fish       74 / 45  = 1.64   worst Rare still beats the best Common
 *   Bananas    95 / 80  = 1.19
 *   Shrimp    110 / 80  = 1.38   worst Epic still beats the best Rare
 * ```
 *
 * Progression is still gated by `levelRequired` (Steak is level 13), not by
 * price — cheap Epic food is not the same as *early* Epic food.
 */

/** `StoreItem.rarity` is nullable; an item without one feeds as a Common. */
export type FoodRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type FeedEffect = {
  /** Subtracted from hunger (floored at 0). Negative. */
  hunger: number;
  /** Added to happiness (capped at 100). */
  happiness: number;
};

export const FEED_EFFECT: Record<FoodRarity, FeedEffect> = {
  // The original flat rate, kept as the baseline so nothing a participant
  // already knows about cheap food changed under them.
  COMMON: { hunger: -18, happiness: 4 },
  RARE: { hunger: -45, happiness: 12 },
  EPIC: { hunger: -80, happiness: 22 },
  // No Legendary food is seeded today, but a Lucky Box pull is not limited
  // to the catalogue's own rarities, and a missing key here would feed a pet
  // `undefined`.
  LEGENDARY: { hunger: -100, happiness: 35 },
};

export function feedEffectOf(rarity: FoodRarity | null | undefined): FeedEffect {
  return FEED_EFFECT[rarity ?? "COMMON"];
}

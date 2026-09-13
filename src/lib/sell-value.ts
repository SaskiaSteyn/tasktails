/**
 * The sell price, split out of `sell.ts` so client components can do the
 * same arithmetic — `sell.ts` imports Prisma and can't cross into the
 * browser bundle. `sell.ts` re-exports `SELL_RATE`, so server callers and
 * `sell.test.ts` keep importing it from there.
 */

/** Confirmed, not a draft — "everything sold at 70% of its bought value." */
export const SELL_RATE = 0.7;

/**
 * #293 — a Shiny adds `SHINY_BONUS_SCALE × √coinPrice` on top of the normal
 * payout. The bonus still grows with the price, but ever slower, so a cheap
 * shiny is a windfall (50 → 141, ~4× normal) while a legendary one stays sane
 * (2,800 → 2,753, ~1.4×) rather than a flat multiplier's 7,840. Safe against
 * box-farming: shinies roll 1 in 40–60.
 */
export const SHINY_BONUS_SCALE = 15;

/** What `sellOwnedItem()` will actually refund for an item at `coinPrice`. */
export function sellValueOf(coinPrice: number, shiny = false): number {
  const bonus = shiny ? SHINY_BONUS_SCALE * Math.sqrt(coinPrice) : 0;
  // Rounded before the floor: 2800 × 0.7 is 1959.9999… in floating point.
  const base = Math.round(coinPrice * SELL_RATE * 1e6) / 1e6;
  return Math.floor(base + bonus);
}

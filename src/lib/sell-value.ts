/**
 * The sell price, split out of `sell.ts` so client components can do the
 * same arithmetic — `sell.ts` imports Prisma and can't cross into the
 * browser bundle. `sell.ts` re-exports `SELL_RATE`, so server callers and
 * `sell.test.ts` keep importing it from there.
 */

/** Confirmed, not a draft — "everything sold at 70% of its bought value." */
export const SELL_RATE = 0.7;

/** What `sellOwnedItem()` will actually refund for an item at `coinPrice`. */
export function sellValueOf(coinPrice: number): number {
  return Math.floor(coinPrice * SELL_RATE);
}

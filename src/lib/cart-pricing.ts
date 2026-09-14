/**
 * #300 — what a cart line costs. Pure and Prisma-free so the cart panel (a
 * client component) and `checkout()` price a line with the same code.
 *
 * `deals` is `dealsForUser()`'s answer (`cart.ts`): store item id → every how
 * many units one is free, for Group B's live multibuy badges. `2` is the Red
 * collar's "Buy 1 get 1" (two collars cost one), `3` a `BundleTimerBadge`
 * "Buy 2 get 1" (three cost two). Items absent from the map pay per unit.
 */
export type Deals = Record<string, number>;

/** Coins the line is charged, after any multibuy discount. */
export function lineCost(
  line: { storeItemId: string; quantity: number; storeItem: { coinPrice: number } },
  deals: Deals,
): number {
  const freeEvery = deals[line.storeItemId];
  const freeUnits = freeEvery ? Math.floor(line.quantity / freeEvery) : 0;
  return line.storeItem.coinPrice * (line.quantity - freeUnits);
}

/** Coins the line would cost without the discount. */
export function lineListCost(line: { quantity: number; storeItem: { coinPrice: number } }): number {
  return line.storeItem.coinPrice * line.quantity;
}

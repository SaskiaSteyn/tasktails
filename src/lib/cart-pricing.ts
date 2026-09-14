/**
 * #300 — what a cart line costs, and what it is shown as costing before its
 * discount. Pure and Prisma-free so the cart panel (a client component) and
 * `checkout()` price a line with the same code.
 *
 * `deals` is `dealsForUser()`'s answer (`cart.ts`), store item id → offer:
 *
 * - `"buy1get1"` — the Red collar. A real deal: every second unit is free.
 * - `"buy2get1"` — a seeded "Buy 2 get 1" bundle. Not a deal: every unit is
 *   charged. The cart inflates the pre-discount figure by one unit per three
 *   and takes that back off as the "discount", so three 5-coin items read
 *   20 − 5 = 15 and the free unit looks deducted when it was paid for.
 *
 * Items absent from the map are priced per unit with no discount.
 */
export type Deal = "buy1get1" | "buy2get1";
export type Deals = Record<string, Deal>;

type PricedLine = {
  storeItemId: string;
  quantity: number;
  storeItem: { coinPrice: number };
};

/** Coins the line is actually charged. */
export function lineCost(line: PricedLine, deals: Deals): number {
  const units =
    deals[line.storeItemId] === "buy1get1"
      ? Math.ceil(line.quantity / 2)
      : line.quantity;
  return line.storeItem.coinPrice * units;
}

/** Coins the line is shown as costing before its discount. */
export function lineListCost(line: PricedLine, deals: Deals): number {
  const units =
    deals[line.storeItemId] === "buy2get1"
      ? line.quantity + Math.floor(line.quantity / 3)
      : line.quantity;
  return line.storeItem.coinPrice * units;
}

import type { CartItem, StoreItem } from "@/generated/prisma/client";
import type { Deals } from "@/lib/cart-pricing";
import { prisma } from "@/lib/prisma";
import { levelOf } from "@/lib/store";
import { groupGatedData } from "@/lib/study-group";
import { logTelemetryEvent } from "@/lib/telemetry";
import {
  CURATED_URGENCY_ITEM_NAMES,
  flashSaleOnDay,
  TWO_FOR_ONE_ITEM_NAME,
  urgencyDataForItems,
} from "@/lib/urgency";

/**
 * Every read and write of a cart (STOR-12..15).
 *
 * Same rule as src/lib/tasks.ts and src/lib/store.ts: nothing outside this
 * module touches `prisma.cartItem`.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { CartItem };

/** A cart row with its catalogue item attached — what the cart panel renders. */
export type CartItemWithStoreItem = CartItem & { storeItem: StoreItem };

/** What `addToCart()` decided (STOR-12). */
export type AddToCartResult =
  | { ok: true; cartItem: CartItemWithStoreItem }
  | { ok: false; reason: "not-found" }
  /** STOR-04's locked card state — the item exists but `userId`'s level is too low. */
  | { ok: false; reason: "locked"; levelRequired: number; level: number };

/**
 * Adds `quantity` of `storeItemId` to `userId`'s cart (STOR-12).
 *
 * `CartItem` has no unique constraint on `(userId, storeItemId)` (INF-06), so
 * a second add of the same item would otherwise create a second row rather
 * than growing the first — this looks for an existing row first and
 * increments it, keeping one row per item per user the way STOR-06's cart
 * panel expects to render it.
 *
 * Enforces the same level gate STOR-04's card shows: a locked item can't be
 * added at all, matching "non-purchasable" on the design. STOR-16's checkout
 * re-checks the gate independently rather than trusting a cart row it didn't
 * create the check for — this is the UX-facing gate, that one is the
 * transaction's actual security boundary, and neither is redundant with the
 * other (a level lost between add-to-cart and checkout, e.g. nothing today
 * lowers level, but the invariant is worth keeping cheap to hold).
 *
 * Logs `ADD_TO_CART` on success (ADM-07's store funnel's middle bar) —
 * STOR-18 scoped its telemetry to `STORE_VISIT`/`ITEM_VIEWED`/
 * `ITEM_PURCHASED` and didn't cover this action, so the funnel had no real
 * data behind "added cart" until now. Not logged for the locked/not-found
 * failure branches — those aren't an add, they're a rejected attempt.
 */
export async function addToCart(
  userId: string,
  storeItemId: string,
  quantity: number = 1,
): Promise<AddToCartResult> {
  const [item, level] = await Promise.all([
    prisma.storeItem.findUnique({ where: { id: storeItemId } }),
    levelOf(userId),
  ]);

  if (!item) return { ok: false, reason: "not-found" };
  if (item.levelRequired > level) {
    return { ok: false, reason: "locked", levelRequired: item.levelRequired, level };
  }

  const existing = await prisma.cartItem.findFirst({
    where: { userId, storeItemId },
  });

  const cartItem = existing
    ? await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
        include: { storeItem: true },
      })
    : await prisma.cartItem.create({
        data: { userId, storeItemId, quantity },
        include: { storeItem: true },
      });

  await logTelemetryEvent(userId, "ADD_TO_CART", { storeItemId, quantity });
  return { ok: true, cartItem };
}

/**
 * `userId`'s current cart, each row with its catalogue item attached
 * (STOR-13) — what STOR-06's cart panel renders directly.
 *
 * Ordered by `id`, ascending — cuids are k-sortable, so this reads as
 * insertion order without a `createdAt` column, same rationale
 * `tasksForUser()`'s subtask ordering documents.
 */
export async function cartForUser(
  userId: string,
): Promise<CartItemWithStoreItem[]> {
  return prisma.cartItem.findMany({
    where: { userId },
    orderBy: { id: "asc" },
    include: { storeItem: true },
  });
}

/**
 * Sets a cart row's quantity outright (STOR-14) — not an increment, unlike
 * `addToCart()`, since this is the quantity stepper editing a line directly
 * rather than a second add of the same item.
 *
 * Scoped to `userId` in the `where` clause (`updateMany`, not `update`) so a
 * cart item id belonging to someone else fails the same way an unknown id
 * does — same "404, not 403" reasoning `updateTask()` documents — rather than
 * a two-query check-then-write that would leak whether the id exists via
 * timing or a different error shape.
 *
 * No level-gate re-check here: STOR-12 already refused a locked item at
 * add-time, so a row existing at all means it passed that gate, and quantity
 * doesn't interact with level the way the item itself does.
 */
export async function updateCartItemQuantity(
  userId: string,
  cartItemId: string,
  quantity: number,
): Promise<CartItemWithStoreItem | null> {
  const { count } = await prisma.cartItem.updateMany({
    where: { id: cartItemId, userId },
    data: { quantity },
  });

  if (count === 0) return null;

  return prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { storeItem: true },
  });
}

/**
 * Removes one row from `userId`'s cart (STOR-15). `deleteMany`, same
 * ownership scoping as `updateCartItemQuantity()` and `deleteTask()` — a
 * mismatched owner or unknown id both come back as "0 rows".
 */
export async function removeFromCart(
  userId: string,
  cartItemId: string,
): Promise<boolean> {
  const { count } = await prisma.cartItem.deleteMany({
    where: { id: cartItemId, userId },
  });
  return count > 0;
}

/**
 * #300 — empties `userId`'s cart (the cart panel's "Clear cart"). Returns
 * how many rows went; 0 on an already-empty cart is not an error.
 */
export async function clearCart(userId: string): Promise<number> {
  const { count } = await prisma.cartItem.deleteMany({ where: { userId } });
  return count;
}

/**
 * #300 — the Group-B deals live for `userId` on `date`'s UTC day, as
 * `lineCost()` (`cart-pricing.ts`) reads them: store item id → every how many
 * units one is free. The Red collar's "Buy 1 get 1" (`"buy1get1"`) and every
 * non-curated item whose seeded footer note is a `BundleTimerBadge` "Buy 2 get
 * 1" (`"buy2get1"`), only on a flash-sale day — the conditions `StorePage`
 * draws those offers under, so the card, the cart and `checkout()` agree. See
 * `cart-pricing.ts` for what each does to the price.
 *
 * Decided at read time, not stored on the cart row: a bundle left in the cart
 * past the sale's rest day (or 00:00 UTC, when the badges reseed) loses its
 * offer, as the badge itself does.
 */
export async function dealsForUser(
  userId: string,
  date: Date = new Date(),
): Promise<Deals> {
  const live = await groupGatedData(() => flashSaleOnDay(userId, date));
  if (!live) return {};

  const items = await prisma.storeItem.findMany({ select: { id: true, name: true } });
  const rows = urgencyDataForItems(userId, items.map((item) => item.id), date);

  const deals: Deals = {};
  items.forEach((item, i) => {
    if (item.name === TWO_FOR_ONE_ITEM_NAME) deals[item.id] = "buy1get1";
    else if (rows[i].showBundleTimer && !CURATED_URGENCY_ITEM_NAMES.includes(item.name)) {
      deals[item.id] = "buy2get1";
    }
  });
  return deals;
}

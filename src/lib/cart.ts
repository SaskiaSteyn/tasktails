import type { CartItem, StoreItem } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { levelOf } from "@/lib/store";

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

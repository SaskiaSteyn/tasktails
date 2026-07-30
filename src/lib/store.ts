import type { StoreItem } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Every read of the store catalogue (STOR-10, STOR-11).
 *
 * Same rule as src/lib/tasks.ts and src/lib/economy.ts: nothing outside this
 * module touches `prisma.storeItem`.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { StoreItem };

/** A catalogue row with the level gate resolved against one user (STOR-04). */
export type StoreItemWithLock = StoreItem & { locked: boolean };

/**
 * `userId`'s current level, for gating a `StoreItem` against (STOR-10, STOR-11,
 * STOR-12). Exported so `src/lib/cart.ts` can apply the same gate at
 * add-to-cart time without a second copy of this lookup.
 */
export async function levelOf(userId: string): Promise<number> {
  const economy = await prisma.userEconomy.findUnique({
    where: { userId },
    select: { level: true },
  });
  return economy?.level ?? 1;
}

/**
 * The full catalogue, each item annotated with whether `userId` can buy it
 * yet.
 *
 * Every item is returned regardless of lock state — STOR-04's card renders
 * locked items too, just non-purchasable with their required level shown, so
 * filtering here would break that screen. Comparison uses `UserEconomy.level`
 * (the denormalised column, kept in step by every XP write per ECO-05) rather
 * than re-deriving from `xp`: it's the same value the checkout gate will
 * eventually filter on in SQL, so a participant never sees an item as
 * unlocked here that checkout would then reject.
 *
 * A user with no economy row (shouldn't happen — AUTH-04 creates one with the
 * account) reads as level 1, matching `EMPTY_ECONOMY` in src/lib/economy.ts.
 */
export async function storeItemsForUser(
  userId: string,
): Promise<StoreItemWithLock[]> {
  const [items, level] = await Promise.all([
    prisma.storeItem.findMany({
      orderBy: [{ levelRequired: "asc" }, { name: "asc" }],
    }),
    levelOf(userId),
  ]);

  return items.map((item) => ({
    ...item,
    locked: item.levelRequired > level,
  }));
}

/**
 * One catalogue row (STOR-11), with `locked` resolved the same way as
 * `storeItemsForUser()`. Null if `itemId` doesn't exist — store items aren't
 * user-owned, so unlike `taskForUser()` there's no ownership check to fold
 * into the same 404.
 */
export async function storeItemForUser(
  userId: string,
  itemId: string,
): Promise<StoreItemWithLock | null> {
  const [item, level] = await Promise.all([
    prisma.storeItem.findUnique({ where: { id: itemId } }),
    levelOf(userId),
  ]);

  if (!item) return null;

  return { ...item, locked: item.levelRequired > level };
}

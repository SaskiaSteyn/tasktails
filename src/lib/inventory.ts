import type { InventoryItem, Prisma, StoreItem } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Every read of an inventory item (INF-05, PET-04/05). Nothing outside this
 * module touches `prisma.inventoryItem` — same rule as `src/lib/tasks.ts` and
 * `src/lib/pets.ts`.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { InventoryItem };

/** An inventory row with the store item it's a copy of — name, category, art. */
export type InventoryItemWithStoreItem = InventoryItem & { storeItem: StoreItem };

/**
 * The user's owned food, for PET-04's feed sheet. `quantity: { gt: 0 }`
 * rather than reading every row ever created — PET-08 decrements `quantity`
 * rather than deleting the row on the last use (mirroring how a completed
 * task stays in history instead of vanishing), so a zeroed-out row is still
 * there but has nothing left to feed with.
 *
 * Oldest-acquired first, same cuid-ordering rationale `petsForUser()` uses —
 * `InventoryItem` has no `createdAt` column either.
 */
export async function foodInventoryForUser(
  userId: string,
): Promise<InventoryItemWithStoreItem[]> {
  return prisma.inventoryItem.findMany({
    where: { userId, quantity: { gt: 0 }, storeItem: { category: "FOOD" } },
    orderBy: { id: "asc" },
    include: { storeItem: true },
  });
}

/**
 * The user's owned accessories, for PET-05's customize sheet. No
 * `quantity: { gt: 0 }` filter here unlike `foodInventoryForUser()` — an
 * accessory isn't consumed by equipping it (PET-09 only ever sets
 * `equippedToPetId`, never touches `quantity`), so a owned-but-currently-
 * equipped-elsewhere accessory still has to show up as pickable.
 */
export async function accessoryInventoryForUser(
  userId: string,
): Promise<InventoryItemWithStoreItem[]> {
  return prisma.inventoryItem.findMany({
    where: { userId, storeItem: { category: "ACCESSORIES" } },
    orderBy: { id: "asc" },
    include: { storeItem: true },
  });
}

/**
 * PET-08 — atomically decrements one unit of a food item, or does nothing.
 * Takes a `Prisma.TransactionClient` rather than reading `prisma` itself:
 * the caller (`recordFeedInteraction()` in `src/lib/pets.ts`) has to consume
 * inventory and update the pet's stats as one atomic unit, or a crash
 * between the two could feed hunger down without ever spending the food (or
 * vice versa) — so this participates in *that* transaction rather than
 * opening its own, the same "the caller owns the transaction" shape
 * `grantEarnings()` uses for `UserEconomy`.
 *
 * `quantity: { gt: 0 }` in the `where` is the atomic guard, same pattern
 * `markTaskComplete()`'s `completedAt: null` uses — the single `UPDATE …
 * WHERE quantity > 0` re-evaluates against the current row under Postgres's
 * row lock, so two concurrent feeds racing for the last unit can't both
 * succeed the way a separate read-then-write would allow. `storeItem:
 * { category: "FOOD" }` guards against an accessory id sneaking in — the
 * feed sheet only ever lists food, but the id arrives from the client, a
 * real trust boundary.
 *
 * Returns the item's new state (not just a boolean) so the caller can
 * include it in its response, or `null` if nothing matched — item doesn't
 * exist, isn't the caller's, isn't food, or is already at 0. One `null` for
 * all four rather than distinguishing them, same "can't tell the
 * difference" reasoning `petForUser()` documents.
 */
export async function consumeFoodItem(
  tx: Prisma.TransactionClient,
  userId: string,
  inventoryItemId: string,
): Promise<InventoryItemWithStoreItem | null> {
  const { count } = await tx.inventoryItem.updateMany({
    where: {
      id: inventoryItemId,
      userId,
      quantity: { gt: 0 },
      storeItem: { category: "FOOD" },
    },
    data: { quantity: { decrement: 1 } },
  });
  if (count === 0) return null;

  return tx.inventoryItem.findUniqueOrThrow({
    where: { id: inventoryItemId },
    include: { storeItem: true },
  });
}

/**
 * PET-09 — equips an accessory to a pet, or does nothing if the caller
 * doesn't own it. Same "caller owns the transaction" shape `consumeFoodItem()`
 * uses, though the ordering matters more here: ownership is verified with a
 * plain `findFirst` *before* anything is written, specifically so a request
 * for an accessory that turns out not to be the caller's can't first strip
 * the pet's *current* accessory and only then discover the new one is
 * invalid — that would leave the pet with nothing equipped after a failed
 * request, which a guarded `updateMany` (this module's usual pattern, see
 * `consumeFoodItem()`) can't prevent on its own the way it can for a single
 * row.
 *
 * At most one accessory equipped per pet at a time — `PetCustomizer`'s
 * accessory grid only ever highlights "whichever accessory is already
 * equipped" (singular, per PET-05's own note), so equipping a new one always
 * displaces whatever this pet was wearing, including an item that was
 * equipped on a *different* pet (moving a physical accessory between pets is
 * exactly that). Unlike
 * `consumeFoodItem()`'s scarce, racy `quantity` decrement, equipping isn't
 * consumed or capped — a race between two clients equipping two different
 * accessories to the same pet just has one write land after the other, an
 * acceptable "last click wins" outcome for a reversible cosmetic action, so
 * this doesn't need `consumeFoodItem()`'s atomic-guard treatment.
 *
 * Returns the newly-equipped item's state, or `null` if it doesn't exist,
 * isn't the caller's, or isn't an accessory — one `null` for all three, same
 * "can't tell the difference" reasoning `petForUser()` documents.
 */
export async function equipAccessory(
  tx: Prisma.TransactionClient,
  userId: string,
  petId: string,
  inventoryItemId: string,
): Promise<InventoryItemWithStoreItem | null> {
  const owned = await tx.inventoryItem.findFirst({
    where: { id: inventoryItemId, userId, storeItem: { category: "ACCESSORIES" } },
  });
  if (!owned) return null;

  await tx.inventoryItem.updateMany({
    where: { equippedToPetId: petId, id: { not: inventoryItemId } },
    data: { equippedToPetId: null },
  });

  return tx.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { equippedToPetId: petId },
    include: { storeItem: true },
  });
}

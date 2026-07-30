import type { InventoryItem, StoreItem } from "@/generated/prisma/client";

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

import type {
  InventoryItem,
  Prisma,
  StoreItem,
  StoreItemCategory,
} from "@/generated/prisma/client";

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
 * The user's owned decorations, for the customize screen's Backgrounds tab —
 * same shape and same "not consumed by equipping" reasoning as
 * `accessoryInventoryForUser()`, just the other equippable category.
 */
export async function decorationInventoryForUser(
  userId: string,
): Promise<InventoryItemWithStoreItem[]> {
  return prisma.inventoryItem.findMany({
    where: { userId, storeItem: { category: "DECORATIONS" } },
    orderBy: { id: "asc" },
    include: { storeItem: true },
  });
}

/**
 * Every category the user owns, for GACHA-08's Sell Items listing —
 * `foodInventoryForUser()`/`accessoryInventoryForUser()` are each scoped to
 * one category for their specific screens and between them don't cover
 * `DECORATIONS` at all. Same `quantity: { gt: 0 }` filter as
 * `foodInventoryForUser()`: a row zeroed out by `GACHA-07`'s sell pipeline
 * has nothing left to sell either.
 */
export async function allInventoryForUser(
  userId: string,
): Promise<InventoryItemWithStoreItem[]> {
  return prisma.inventoryItem.findMany({
    where: { userId, quantity: { gt: 0 } },
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

/** The two categories a pet can equip via the customize screen — see `equipCustomization()`. */
const EQUIPPABLE_CATEGORIES: StoreItemCategory[] = ["ACCESSORIES", "DECORATIONS"];

/**
 * PET-09 — equips an accessory *or decoration* (background) to a pet, or
 * does nothing if the caller doesn't own it. Same "caller owns the
 * transaction" shape `consumeFoodItem()` uses, though the ordering matters
 * more here: ownership is verified with a plain `findFirst` *before*
 * anything is written, specifically so a request for an item that turns out
 * not to be the caller's can't first strip the pet's *current* item of that
 * category and only then discover the new one is invalid — that would leave
 * the pet with nothing equipped after a failed request, which a guarded
 * `updateMany` (this module's usual pattern, see `consumeFoodItem()`) can't
 * prevent on its own the way it can for a single row.
 *
 * At most one item equipped **per category** per pet at a time —
 * `PetCustomizer`'s accessory/background grids each only ever highlight
 * "whichever item of *that* category is already equipped" (singular, per
 * PET-05's own note), so equipping a new one always displaces whatever this
 * pet had on in the *same* category, including an item that was equipped on
 * a *different* pet (moving a physical item between pets is exactly that) —
 * but never the other category's item. The unequip `updateMany` below is
 * scoped to `owned.storeItem.category` for exactly this reason: an earlier
 * version of this function (`equipAccessory`, ACCESSORIES-only) wiped
 * *every* equipped item regardless of category, which was harmless while
 * ACCESSORIES was the only equippable category but would have silently
 * unequipped a pet's background the moment it also equipped an accessory,
 * once DECORATIONS became equippable too.
 *
 * Unlike `consumeFoodItem()`'s scarce, racy `quantity` decrement, equipping
 * isn't consumed or capped — a race between two clients equipping two
 * different items to the same pet just has one write land after the other,
 * an acceptable "last click wins" outcome for a reversible cosmetic action,
 * so this doesn't need `consumeFoodItem()`'s atomic-guard treatment.
 *
 * Returns the newly-equipped item's state, or `null` if it doesn't exist,
 * isn't the caller's, or isn't an accessory/decoration — one `null` for all
 * three, same "can't tell the difference" reasoning `petForUser()` documents.
 */
export async function equipCustomization(
  tx: Prisma.TransactionClient,
  userId: string,
  petId: string,
  inventoryItemId: string,
): Promise<InventoryItemWithStoreItem | null> {
  const owned = await tx.inventoryItem.findFirst({
    where: { id: inventoryItemId, userId, storeItem: { category: { in: EQUIPPABLE_CATEGORIES } } },
    include: { storeItem: true },
  });
  if (!owned) return null;

  await tx.inventoryItem.updateMany({
    where: {
      equippedToPetId: petId,
      id: { not: inventoryItemId },
      storeItem: { category: owned.storeItem.category },
    },
    data: { equippedToPetId: null },
  });

  return tx.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { equippedToPetId: petId },
    include: { storeItem: true },
  });
}

/**
 * The reverse of `equipCustomization()` — tapping the already-equipped tile
 * again clears it rather than being a no-op, at the user's request. A single
 * guarded `updateMany` is enough here (unlike `equipCustomization()`'s
 * findFirst-then-write ordering): unequipping only ever touches the one row
 * being asked about, so there's no "strip the old one, then discover the new
 * one was invalid" hazard to guard against — `where` doubles as the
 * ownership *and* "is it actually equipped to this pet" check in one write,
 * same pattern `consumeFoodItem()` uses its `quantity: { gt: 0 }` guard for.
 *
 * Returns the item's now-unequipped state, or `null` if it doesn't exist,
 * isn't the caller's, isn't an accessory/decoration, or wasn't equipped to
 * this pet to begin with — one `null` for all four, same "can't tell the
 * difference" reasoning `petForUser()` documents.
 */
export async function unequipCustomization(
  tx: Prisma.TransactionClient,
  userId: string,
  petId: string,
  inventoryItemId: string,
): Promise<InventoryItemWithStoreItem | null> {
  const { count } = await tx.inventoryItem.updateMany({
    where: {
      id: inventoryItemId,
      userId,
      equippedToPetId: petId,
      storeItem: { category: { in: EQUIPPABLE_CATEGORIES } },
    },
    data: { equippedToPetId: null },
  });
  if (count === 0) return null;

  return tx.inventoryItem.findUniqueOrThrow({
    where: { id: inventoryItemId },
    include: { storeItem: true },
  });
}

/**
 * The background art each pet currently has equipped (a `DECORATIONS`
 * `InventoryItem` with `equippedToPetId` set and real art per `hasRealArt()`
 * — an equipped `Cosy den`-style icon-fallback decoration has nothing here
 * to show as a stage background), keyed by pet id. One query for however
 * many pets the caller owns, since the gallery (`/zoo`) needs every pet's
 * background at once rather than issuing one query per card.
 */
export async function equippedBackgroundsForUser(
  userId: string,
): Promise<Record<string, string>> {
  const equipped = await prisma.inventoryItem.findMany({
    where: { userId, equippedToPetId: { not: null }, storeItem: { category: "DECORATIONS" } },
    include: { storeItem: true },
  });

  const backgrounds: Record<string, string> = {};
  for (const item of equipped) {
    if (item.equippedToPetId && item.storeItem.imageUrl.startsWith("/")) {
      backgrounds[item.equippedToPetId] = item.storeItem.imageUrl;
    }
  }
  return backgrounds;
}

/**
 * Same as `equippedBackgroundsForUser()` but scoped to one pet — the
 * Sanctuary drill-in (`/zoo/[id]`) only ever needs its own pet's background,
 * not every pet the user owns.
 */
export async function equippedBackgroundForPet(
  userId: string,
  petId: string,
): Promise<string | undefined> {
  const item = await prisma.inventoryItem.findFirst({
    where: { userId, equippedToPetId: petId, storeItem: { category: "DECORATIONS" } },
    include: { storeItem: true },
  });
  return item && item.storeItem.imageUrl.startsWith("/") ? item.storeItem.imageUrl : undefined;
}

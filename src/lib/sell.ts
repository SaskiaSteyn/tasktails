import type { StoreItemCategory, UserEconomy } from "@/generated/prisma/client";
import { UNLOCK_LEVEL_BUFFER } from "@/lib/gacha";
import { allInventoryForUser } from "@/lib/inventory";
import { petsForUser } from "@/lib/pets";
import { prisma } from "@/lib/prisma";
import { levelOf } from "@/lib/store";

/**
 * GACHA-07/GACHA-08 — `POST /api/inventory/[id]/sell` and
 * `GET /api/inventory/sellable`.
 *
 * `sellOwnedItem()` (the write) is a deliberate exception to the "one module
 * per table" rule, same reasoning `checkout.ts`/`gacha.ts` give for
 * themselves: selling touches `InventoryItem` *or* `Pet`, plus `StoreItem`
 * for the price and `UserEconomy` for the refund, as one atomic unit.
 * `sellableItemsForUser()` (the read) doesn't need that exception — it has
 * no atomicity requirement, so it composes `inventory.ts`'s and `pets.ts`'s
 * own exported reads (`allInventoryForUser()`, `petsForUser()`) rather than
 * querying `prisma.inventoryItem`/`prisma.pet` directly, the same
 * read-vs-write split `store.ts` (reads) and `checkout.ts` (the atomic
 * write) already use for `StoreItem`.
 *
 * **The route name says "inventory" but this also sells pets.** The ticket
 * text is explicit that *everything* a player owns has to be sellable,
 * "including animals pulled above the user's level" — the design board
 * names Rhino by name as an example. But an owned animal isn't an
 * `InventoryItem` row at all: `checkout.ts` and `gacha.ts` both create a
 * `Pet` for an `ANIMALS` purchase/pull instead (an animal has no `quantity`
 * — each one is a distinct creature with its own happiness/hunger). So
 * `sellOwnedItem()` below tries `InventoryItem` first (by far the common
 * case) and falls back to `Pet` if nothing matched — one endpoint, one id
 * param, resolved against whichever table actually owns it, rather than
 * inventing a second route the design's single "Sell" button per row
 * doesn't have room for.
 *
 * Selling a pet **deletes it outright** — there's no `quantity` to
 * decrement, unlike a goods stack. Any accessory equipped to it unequips
 * for free: `InventoryItem.equippedToPetId` is already `onDelete: SetNull`
 * in the schema (INF-05), so Postgres does this without a manual step here.
 *
 * `SELL_RATE` is not a draft — the user's own brief fixed it at 70%. Same
 * status as `gacha.ts`'s price/odds/pity constants, confirmed 2026-08-07.
 *
 * SERVER ONLY — imports Prisma.
 */

/** Confirmed, not a draft — "everything sold at 70% of its bought value." */
export const SELL_RATE = 0.7;

export type SoldItem = {
  storeItemId: string;
  /** A pet's custom name if it has one, else the catalogue name — same fallback `pets.ts` documents for `Pet.name`. */
  name: string;
};

export type SellResult =
  | { ok: true; refund: number; item: SoldItem; economy: UserEconomy }
  /** One reason for "doesn't exist", "isn't yours", and "already sold" — same "can't tell the difference" shape `taskForUser()`/`consumeFoodItem()` use. */
  | { ok: false; reason: "not-found" };

/**
 * `id` may be an `InventoryItem` id or a `Pet` id — see the file doc comment
 * for why one endpoint covers both. Refund is `floor(coinPrice * SELL_RATE)`,
 * against the item's real catalogue price regardless of whether it was
 * bought (`checkout.ts`) or pulled (`gacha.ts`) — the same "the box just
 * grants what you'd otherwise buy" reasoning `GACHA-04`'s doc comment uses
 * for pricing.
 */
export async function sellOwnedItem(
  userId: string,
  id: string,
): Promise<SellResult> {
  return prisma.$transaction(async (tx) => {
    const inventoryItem = await tx.inventoryItem.findFirst({
      where: { id, userId, quantity: { gt: 0 } },
      include: { storeItem: true },
    });

    if (inventoryItem) {
      const refund = Math.floor(inventoryItem.storeItem.coinPrice * SELL_RATE);

      if (inventoryItem.quantity > 1) {
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: { decrement: 1 } },
        });
      } else {
        await tx.inventoryItem.delete({ where: { id: inventoryItem.id } });
      }

      const economy = await tx.userEconomy.update({
        where: { userId },
        data: { coins: { increment: refund } },
      });

      return {
        ok: true,
        refund,
        item: { storeItemId: inventoryItem.storeItemId, name: inventoryItem.storeItem.name },
        economy,
      } as const;
    }

    const pet = await tx.pet.findFirst({
      where: { id, userId },
      include: { storeItem: true },
    });

    if (!pet) return { ok: false, reason: "not-found" } as const;

    const refund = Math.floor(pet.storeItem.coinPrice * SELL_RATE);

    await tx.pet.delete({ where: { id: pet.id } });

    const economy = await tx.userEconomy.update({
      where: { userId },
      data: { coins: { increment: refund } },
    });

    return {
      ok: true,
      refund,
      item: { storeItemId: pet.storeItemId, name: pet.name ?? pet.storeItem.name },
      economy,
    } as const;
  });
}

/** One row of GACHA-17's Sell Items list — either an `InventoryItem` or a `Pet`, `id` being whichever `GACHA-07`'s sell endpoint expects back. */
export type SellableItem = {
  id: string;
  storeItemId: string;
  name: string;
  category: StoreItemCategory;
  /** Always 1 for a pet — an animal has no stack to hold a bigger count. */
  quantity: number;
  coinPrice: number;
  sellValue: number;
  /**
   * Same `> level + UNLOCK_LEVEL_BUFFER` rule `gacha.ts`'s `pullLuckyBox()`
   * uses to decide whether a pull is immediately usable — sellable
   * regardless either way, per `GACHA-07`. A plain store purchase can never
   * land here above `level` at all (`checkout.ts` blocks it), so the only
   * way an owned item can be locked is a gacha pull, which makes this the
   * same rule by construction, not a separate policy that happens to agree.
   */
  locked: boolean;
};

/**
 * Everything `userId` owns and could sell — goods and pets together, each
 * annotated with its `sellValue` (`floor(coinPrice * SELL_RATE)`, the same
 * arithmetic `sellOwnedItem()` actually charges) and whether it's currently
 * locked. Locked items are included, not filtered out — `GACHA-07` sells
 * them exactly like anything else, and the Sell Items screen is explicit
 * that a locked animal like Rhino belongs in this list too.
 */
export async function sellableItemsForUser(userId: string): Promise<SellableItem[]> {
  const [goods, pets, level] = await Promise.all([
    allInventoryForUser(userId),
    petsForUser(userId),
    levelOf(userId),
  ]);

  const sellableGoods: SellableItem[] = goods.map((item) => ({
    id: item.id,
    storeItemId: item.storeItemId,
    name: item.storeItem.name,
    category: item.storeItem.category,
    quantity: item.quantity,
    coinPrice: item.storeItem.coinPrice,
    sellValue: Math.floor(item.storeItem.coinPrice * SELL_RATE),
    locked: item.storeItem.levelRequired > level + UNLOCK_LEVEL_BUFFER,
  }));

  const sellablePets: SellableItem[] = pets.map((pet) => ({
    id: pet.id,
    storeItemId: pet.storeItemId,
    name: pet.name ?? pet.storeItem.name,
    category: pet.storeItem.category,
    quantity: 1,
    coinPrice: pet.storeItem.coinPrice,
    sellValue: Math.floor(pet.storeItem.coinPrice * SELL_RATE),
    locked: pet.storeItem.levelRequired > level + UNLOCK_LEVEL_BUFFER,
  }));

  return [...sellableGoods, ...sellablePets];
}

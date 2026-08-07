import type { UserEconomy } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GACHA-07 — `POST /api/inventory/[id]/sell`'s pipeline.
 *
 * A deliberate exception to the "one module per table" rule, same reasoning
 * `checkout.ts`/`gacha.ts` give for themselves: selling touches
 * `InventoryItem` *or* `Pet`, plus `StoreItem` for the price and
 * `UserEconomy` for the refund, as one atomic unit.
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
 * `SELL_RATE` is not a draft — the user's own brief fixed it at 70%, unlike
 * `gacha.ts`'s price/odds/pity constants which are still pending sign-off.
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

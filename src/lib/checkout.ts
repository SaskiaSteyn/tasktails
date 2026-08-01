import type {
  InventoryItem,
  Transaction,
  UserEconomy,
} from "@/generated/prisma/client";
import { createPetForTransaction, type PetWithItem } from "@/lib/pets";
import { prisma } from "@/lib/prisma";

/**
 * STOR-16 — `POST /api/store/checkout`'s pipeline.
 *
 * A deliberate exception to the "one module per table" rule the rest of the
 * lib follows (`tasks.ts` owns `Task`, `cart.ts` owns `CartItem`,
 * `economy.ts` owns `UserEconomy`, `store.ts` owns `StoreItem`, `pets.ts`
 * owns `Pet`): checkout has to read and write six tables — `CartItem`,
 * `StoreItem`, `UserEconomy`, `Transaction`, `InventoryItem`, `Pet` — as one
 * atomic unit, and that's only possible if every read and write in the
 * pipeline runs on the same `tx` client. Routing through each table's own
 * module would mean calling functions built on the module-level `prisma`
 * singleton, which would not participate in this transaction. The one
 * exception is `Pet`: `pets.ts`'s `createPetForTransaction()` already takes
 * a `Prisma.TransactionClient` for exactly this reason (its own doc comment
 * anticipated this ticket by name), so that one *is* called through its
 * owning module rather than reimplemented here. `Transaction` and
 * `InventoryItem` have no other module yet, so this is where they start
 * being owned.
 *
 * SERVER ONLY — imports Prisma.
 */

export type PurchasedLine = {
  storeItemId: string;
  name: string;
  quantity: number;
  coinSpent: number;
};

export type CheckoutResult =
  | {
      ok: true;
      spent: number;
      purchased: PurchasedLine[];
      transactions: Transaction[];
      /** One entry per unit adopted — an ANIMALS line with quantity 3 adopts 3 distinct pets. */
      pets: PetWithItem[];
      economy: UserEconomy;
    }
  | { ok: false; reason: "empty-cart" }
  | { ok: false; reason: "no-account" }
  | {
      ok: false;
      reason: "locked";
      /** Every cart line above the account's current level, not just the first. */
      items: { storeItemId: string; name: string; levelRequired: number }[];
    }
  | {
      ok: false;
      reason: "insufficient-coins";
      coins: number;
      shortfall: number;
    };

/**
 * Buys everything in `userId`'s cart (STOR-16).
 *
 * Order of checks mirrors the ticket's own bullet list: validate the cart
 * isn't empty, check level gates, check the coin balance, then commit the
 * spend and the catalogue records together. Coins are read with
 * `SELECT … FOR UPDATE`, the same pattern `economy.ts`'s `grantEarnings()`
 * and `buyXp()` use — two checkouts submitted together must not both pass
 * the balance check against the same starting total.
 *
 * The level gate is re-checked here against the row locked in *this*
 * transaction, not `store.ts`'s `levelOf()` — STOR-12 already refused a
 * locked item at add-to-cart time, so this is the actual security boundary
 * `cart.ts`'s `addToCart()` documents that add-time check as a UX front for,
 * not a second copy of the same check.
 *
 * One `Transaction` row per cart *line* (not per unit) — coinSpent is the
 * line's total (`coinPrice * quantity`), matching the ~200-row, 20-user,
 * 2-week volume estimate in `Requirements.md` §5, which only holds if a
 * checkout with quantity 3 writes one row, not three.
 *
 * Every line splits on `storeItem.category`. `ANIMALS` lines never touch
 * `InventoryItem` — each *unit* becomes its own `Pet` row via
 * `createPetForTransaction()` (quantity 3 adopts 3 distinct animals, not one
 * row with a quantity of 3), since `Pet` has no quantity column and each one
 * tracks its own happiness/hunger independently. Every other category is
 * unaffected by this and keeps working the way it always did: found by
 * `(userId, storeItemId, equippedToPetId: null)` and incremented, or created
 * if there's no unequipped stack yet — same "increment an existing row
 * rather than duplicate it" shape as `addToCart()`. Equipped copies are
 * never matched here, since a purchase always lands as a fresh, unequipped
 * quantity; PET-04's equip flow is what moves a unit out of this stack
 * later.
 *
 * Logs one `ITEM_PURCHASED` `TelemetryEvent` per line — STOR-16's own "log
 * telemetry" bullet, not STOR-18's broader pass (that ticket's
 * `STORE_VISIT`/`ITEM_VIEWED` are page-view events with nothing to do with
 * a transaction).
 *
 * The cart is cleared unconditionally on success — a partial checkout that
 * leaves some lines behind isn't a case any bullet describes, and clearing
 * everything is what "purchase the cart" means.
 */
export async function checkout(userId: string): Promise<CheckoutResult> {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cartItem.findMany({
      where: { userId },
      include: { storeItem: true },
    });
    if (cart.length === 0) return { ok: false, reason: "empty-cart" } as const;

    const locked = await tx.$queryRaw<{ coins: number; level: number }[]>`
      SELECT "coins", "level"
      FROM "UserEconomy"
      WHERE "userId" = ${userId}
      FOR UPDATE`;

    const account = locked[0];
    if (!account) return { ok: false, reason: "no-account" } as const;

    const lockedLines = cart.filter(
      (line) => line.storeItem.levelRequired > account.level,
    );
    if (lockedLines.length > 0) {
      return {
        ok: false,
        reason: "locked",
        items: lockedLines.map((line) => ({
          storeItemId: line.storeItemId,
          name: line.storeItem.name,
          levelRequired: line.storeItem.levelRequired,
        })),
      } as const;
    }

    const total = cart.reduce(
      (sum, line) => sum + line.storeItem.coinPrice * line.quantity,
      0,
    );
    if (account.coins < total) {
      return {
        ok: false,
        reason: "insufficient-coins",
        coins: account.coins,
        shortfall: total - account.coins,
      } as const;
    }

    const purchasedAt = new Date();

    const transactions = await Promise.all(
      cart.map((line) =>
        tx.transaction.create({
          data: {
            userId,
            storeItemId: line.storeItemId,
            coinSpent: line.storeItem.coinPrice * line.quantity,
            purchasedAt,
          },
        }),
      ),
    );

    const animalLines = cart.filter((line) => line.storeItem.category === "ANIMALS");
    const goodsLines = cart.filter((line) => line.storeItem.category !== "ANIMALS");

    const inventoryUpdates: Promise<InventoryItem>[] = goodsLines.map(
      async (line) => {
        const existing = await tx.inventoryItem.findFirst({
          where: {
            userId,
            storeItemId: line.storeItemId,
            equippedToPetId: null,
          },
        });

        return existing
          ? tx.inventoryItem.update({
              where: { id: existing.id },
              data: { quantity: { increment: line.quantity } },
            })
          : tx.inventoryItem.create({
              data: { userId, storeItemId: line.storeItemId, quantity: line.quantity },
            });
      },
    );

    const petCreations: Promise<PetWithItem | null>[] = animalLines.flatMap(
      (line) =>
        Array.from({ length: line.quantity }, () =>
          createPetForTransaction(tx, userId, line.storeItem, purchasedAt),
        ),
    );

    const [, createdPets] = await Promise.all([
      Promise.all(inventoryUpdates),
      Promise.all(petCreations),
    ]);
    const pets = createdPets.filter((pet): pet is PetWithItem => pet !== null);

    const economy = await tx.userEconomy.update({
      where: { userId },
      data: { coins: { decrement: total } },
    });

    await tx.cartItem.deleteMany({ where: { userId } });

    await Promise.all(
      cart.map((line) =>
        tx.telemetryEvent.create({
          data: {
            userId,
            eventType: "ITEM_PURCHASED",
            payload: {
              storeItemId: line.storeItemId,
              name: line.storeItem.name,
              quantity: line.quantity,
              coinSpent: line.storeItem.coinPrice * line.quantity,
            },
          },
        }),
      ),
    );

    return {
      ok: true,
      spent: total,
      purchased: cart.map((line) => ({
        storeItemId: line.storeItemId,
        name: line.storeItem.name,
        quantity: line.quantity,
        coinSpent: line.storeItem.coinPrice * line.quantity,
      })),
      transactions,
      pets,
      economy,
    } as const;
  });
}

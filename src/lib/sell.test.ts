import { beforeEach, describe, expect, it, vi } from "vitest";

import { SELL_RATE, sellableItemsForUser, sellOwnedItem } from "@/lib/sell";
import { prismaMock } from "@/test/prisma-mock";

/**
 * GACHA-07/08 — the sell transaction and the sellable-items listing, both
 * against the mocked Prisma client (same pattern gacha.test.ts uses for
 * pullLuckyBox). `sellableItemsForUser()` composes `inventory.ts`'s and
 * `pets.ts`'s own reads rather than querying Prisma directly (see sell.ts's
 * doc comment), but those reads still bottom out in the same mocked
 * `prismaMock.inventoryItem.findMany`/`.pet.findMany`/`.userEconomy.
 * findUnique` calls, so no extra mocking of sibling modules is needed.
 */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

describe("sellOwnedItem", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
    prismaMock.userEconomy.update.mockResolvedValue({ coins: 0 } as never);
    prismaMock.inventoryItem.findFirst.mockResolvedValue(null);
    prismaMock.pet.findFirst.mockResolvedValue(null);
  });

  it("decrements quantity rather than deleting when more than one is owned", async () => {
    prismaMock.inventoryItem.findFirst.mockResolvedValue({
      id: "inv-1",
      storeItemId: "collar",
      quantity: 3,
      storeItem: { name: "Red collar", coinPrice: 65 },
    } as never);

    const result = await sellOwnedItem("user-1", "inv-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.refund).toBe(Math.floor(65 * SELL_RATE));
    expect(result.item).toEqual({ storeItemId: "collar", name: "Red collar" });
    expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { quantity: { decrement: 1 } },
    });
    expect(prismaMock.inventoryItem.delete).not.toHaveBeenCalled();
    expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { coins: { increment: result.refund } },
    });
  });

  it("deletes the row when it's the last unit", async () => {
    prismaMock.inventoryItem.findFirst.mockResolvedValue({
      id: "inv-1",
      storeItemId: "collar",
      quantity: 1,
      storeItem: { name: "Red collar", coinPrice: 65 },
    } as never);

    const result = await sellOwnedItem("user-1", "inv-1");

    expect(result.ok).toBe(true);
    expect(prismaMock.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: "inv-1" } });
    expect(prismaMock.inventoryItem.update).not.toHaveBeenCalled();
  });

  it("rounds the refund down, not to the nearest coin", async () => {
    // 65 * 0.7 = 45.49999999999999 in floating point — floor must still land on 45.
    prismaMock.inventoryItem.findFirst.mockResolvedValue({
      id: "inv-1",
      storeItemId: "collar",
      quantity: 1,
      storeItem: { name: "Red collar", coinPrice: 65 },
    } as never);

    const result = await sellOwnedItem("user-1", "inv-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.refund).toBe(45);
  });

  it("falls back to selling a Pet when the id isn't an InventoryItem", async () => {
    prismaMock.pet.findFirst.mockResolvedValue({
      id: "pet-1",
      storeItemId: "rhino",
      name: null,
      storeItem: { name: "Rhino", coinPrice: 3000 },
    } as never);

    const result = await sellOwnedItem("user-1", "pet-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.refund).toBe(2100);
    expect(result.item).toEqual({ storeItemId: "rhino", name: "Rhino" });
    expect(prismaMock.pet.delete).toHaveBeenCalledWith({ where: { id: "pet-1" } });
    expect(prismaMock.inventoryItem.update).not.toHaveBeenCalled();
    expect(prismaMock.inventoryItem.delete).not.toHaveBeenCalled();
  });

  it("prefers a pet's custom name over the catalogue name", async () => {
    prismaMock.pet.findFirst.mockResolvedValue({
      id: "pet-1",
      storeItemId: "fox",
      name: "Sunny",
      storeItem: { name: "Fox kit", coinPrice: 550 },
    } as never);

    const result = await sellOwnedItem("user-1", "pet-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.name).toBe("Sunny");
  });

  it("sells a locked, above-level pet exactly like any other — no lock check at all", async () => {
    // Nothing in sellOwnedItem reads StoreItem.levelRequired or the caller's
    // level — selling doesn't care whether the pet is still locked.
    prismaMock.pet.findFirst.mockResolvedValue({
      id: "pet-1",
      storeItemId: "rhino",
      name: null,
      storeItem: { name: "Rhino", coinPrice: 3000, levelRequired: 20 },
    } as never);

    const result = await sellOwnedItem("user-1", "pet-1");

    expect(result.ok).toBe(true);
  });

  it("reports not-found rather than crashing when the id matches neither table", async () => {
    const result = await sellOwnedItem("user-1", "does-not-exist");

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(prismaMock.userEconomy.update).not.toHaveBeenCalled();
  });
});

describe("sellableItemsForUser", () => {
  beforeEach(() => {
    prismaMock.userEconomy.findUnique.mockResolvedValue({ level: 5 } as never);
  });

  it("combines goods and pets into one list, each with its computed sell value", async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      {
        id: "inv-1",
        storeItemId: "collar",
        quantity: 2,
        storeItem: {
          name: "Red collar",
          category: "ACCESSORIES",
          imageUrl: "shirt",
          coinPrice: 65,
          levelRequired: 1,
        },
      },
    ] as never);
    prismaMock.pet.findMany.mockResolvedValue([
      {
        id: "pet-1",
        storeItemId: "fox",
        name: null,
        happiness: 100,
        hunger: 0,
        lastInteractedAt: new Date(),
        storeItem: {
          name: "Fox kit",
          category: "ANIMALS",
          imageUrl: "/animals/happy/fox.svg",
          coinPrice: 550,
          levelRequired: 7,
        },
      },
    ] as never);

    const items = await sellableItemsForUser("user-1");

    expect(items).toEqual([
      {
        id: "inv-1",
        storeItemId: "collar",
        name: "Red collar",
        category: "ACCESSORIES",
        imageUrl: "shirt",
        quantity: 2,
        coinPrice: 65,
        sellValue: 45,
        levelRequired: 1,
        locked: false,
      },
      {
        id: "pet-1",
        storeItemId: "fox",
        name: "Fox kit",
        category: "ANIMALS",
        imageUrl: "/animals/happy/fox.svg",
        quantity: 1,
        coinPrice: 550,
        sellValue: 385,
        levelRequired: 7,
        locked: true, // levelRequired 7 > account level 5
      },
    ]);
  });

  it("includes locked items rather than filtering them out", async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([]);
    prismaMock.pet.findMany.mockResolvedValue([
      {
        id: "pet-rhino",
        storeItemId: "rhino",
        name: null,
        happiness: 100,
        hunger: 0,
        lastInteractedAt: new Date(),
        storeItem: { name: "Rhino", category: "ANIMALS", coinPrice: 3000, levelRequired: 20 },
      },
    ] as never);

    const items = await sellableItemsForUser("user-1");

    expect(items).toHaveLength(1);
    expect(items[0].locked).toBe(true);
    expect(items[0].sellValue).toBe(2100);
  });

  it("reads unlocked when the item is within GACHA-04's UNLOCK_LEVEL_BUFFER, not just at-or-below level", async () => {
    // Account is level 5 (mocked above); an item requiring level 6 is one
    // above — the same buffer pullLuckyBox() uses to grant immediate use.
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      {
        id: "inv-next-tier",
        storeItemId: "next-tier",
        quantity: 1,
        storeItem: { name: "Next tier item", category: "ACCESSORIES", coinPrice: 100, levelRequired: 6 },
      },
    ] as never);
    prismaMock.pet.findMany.mockResolvedValue([]);

    const items = await sellableItemsForUser("user-1");

    expect(items).toHaveLength(1);
    expect(items[0].locked).toBe(false);
  });

  it("prefers a pet's custom name over the catalogue name in the listing too", async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([]);
    prismaMock.pet.findMany.mockResolvedValue([
      {
        id: "pet-1",
        storeItemId: "fox",
        name: "Sunny",
        happiness: 100,
        hunger: 0,
        lastInteractedAt: new Date(),
        storeItem: { name: "Fox kit", category: "ANIMALS", coinPrice: 550, levelRequired: 1 },
      },
    ] as never);

    const items = await sellableItemsForUser("user-1");

    expect(items[0].name).toBe("Sunny");
  });
});

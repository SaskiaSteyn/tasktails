import { beforeEach, describe, expect, it, vi } from "vitest";

import { SELL_RATE, sellOwnedItem } from "@/lib/sell";
import { prismaMock } from "@/test/prisma-mock";

/** GACHA-07 — the sell transaction against the mocked Prisma client, same pattern gacha.test.ts uses for pullLuckyBox. */
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

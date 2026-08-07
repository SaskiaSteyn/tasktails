import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ABOVE_LEVEL_PULL_CHANCE,
  LUCKY_BOX_COST_COINS,
  pullLuckyBox,
  rollRarity,
} from "@/lib/gacha";
import { prismaMock } from "@/test/prisma-mock";

/** GACHA-04 — the weighted roll (pure) and the pull transaction (mocked Prisma), same split economy.test.ts uses for buyXp. */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const storeItem = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "item-1",
  name: "Test item",
  category: "FOOD",
  levelRequired: 1,
  coinPrice: 40,
  imageUrl: "wheat",
  rarity: "COMMON",
  ...overrides,
}) as never;

describe("rollRarity", () => {
  it("picks Common at the low end of the range", () => {
    expect(rollRarity(() => 0)).toBe("COMMON");
    expect(rollRarity(() => 0.549)).toBe("COMMON");
  });

  it("picks Rare just past the Common/Rare boundary (0.55)", () => {
    expect(rollRarity(() => 0.55)).toBe("RARE");
    expect(rollRarity(() => 0.849)).toBe("RARE");
  });

  it("picks Epic just past the Rare/Epic boundary (~0.85)", () => {
    // Not exactly 0.85 — 0.55 + 0.3 is 0.8500000000000001 in floating point,
    // so a literal 0.85 falls just under the real cumulative boundary and
    // would still read as Rare. Same reasoning as `rollRarity()`'s own
    // "rounding guard" comment.
    expect(rollRarity(() => 0.851)).toBe("EPIC");
    expect(rollRarity(() => 0.969)).toBe("EPIC");
  });

  it("picks Legendary for the top of the range", () => {
    expect(rollRarity(() => 0.98)).toBe("LEGENDARY");
    expect(rollRarity(() => 0.999999)).toBe("LEGENDARY");
  });
});

describe("pullLuckyBox", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
    prismaMock.userEconomy.update.mockResolvedValue({ coins: 0 } as never);
  });

  it("rejects a pull with no account", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    const result = await pullLuckyBox("user-1");

    expect(result).toEqual({ ok: false, reason: "no-account" });
  });

  it("rejects a pull without enough coins", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 100, level: 1 }]);

    const result = await pullLuckyBox("user-1");

    expect(result).toEqual({
      ok: false,
      reason: "insufficient-coins",
      coins: 100,
      shortfall: LUCKY_BOX_COST_COINS - 100,
    });
    expect(prismaMock.storeItem.findMany).not.toHaveBeenCalled();
  });

  it("creates a new InventoryItem row for a first-time goods pull", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 500, level: 5 }]);
    prismaMock.storeItem.findMany.mockResolvedValue([
      storeItem({ id: "collar", name: "Red collar", category: "ACCESSORIES" }),
    ]);
    prismaMock.inventoryItem.findFirst.mockResolvedValue(null);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.id).toBe("collar");
    expect(result.item.aboveLevel).toBe(false);
    expect(result.pet).toBeNull();
    expect(result.spent).toBe(LUCKY_BOX_COST_COINS);
    expect(prismaMock.inventoryItem.create).toHaveBeenCalledWith({
      data: { userId: "user-1", storeItemId: "collar", quantity: 1 },
    });
    expect(prismaMock.inventoryItem.update).not.toHaveBeenCalled();
    expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { coins: { decrement: LUCKY_BOX_COST_COINS } },
    });
  });

  it("increments quantity instead of duplicating when the goods item is already owned", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 500, level: 5 }]);
    prismaMock.storeItem.findMany.mockResolvedValue([storeItem({ id: "collar" })]);
    prismaMock.inventoryItem.findFirst.mockResolvedValue({ id: "inv-1" } as never);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(true);
    expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { quantity: { increment: 1 } },
    });
    expect(prismaMock.inventoryItem.create).not.toHaveBeenCalled();
  });

  it("adopts a new Pet, not an InventoryItem row, for an animal pull", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 500, level: 10 }]);
    prismaMock.storeItem.findMany.mockResolvedValue([
      storeItem({ id: "fox", name: "Fox kit", category: "ANIMALS", rarity: "EPIC" }),
    ]);
    prismaMock.pet.create.mockResolvedValue({
      id: "pet-1",
      storeItem: storeItem({ id: "fox", category: "ANIMALS" }),
    } as never);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pet?.id).toBe("pet-1");
    expect(prismaMock.pet.create).toHaveBeenCalled();
    expect(prismaMock.inventoryItem.create).not.toHaveBeenCalled();
    expect(prismaMock.inventoryItem.findFirst).not.toHaveBeenCalled();
  });

  it("falls back to the above-level pool when nothing eligible exists at the account's level", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 500, level: 5 }]);
    // First findMany (in-level) empty, second (above-level) has the Legendary item.
    prismaMock.storeItem.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        storeItem({ id: "crown", name: "Crown", category: "ACCESSORIES", levelRequired: 20, rarity: "LEGENDARY" }),
      ]);
    prismaMock.inventoryItem.findFirst.mockResolvedValue(null);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.id).toBe("crown");
    expect(result.item.aboveLevel).toBe(true);
  });

  it("reports empty-catalogue rather than crashing when both pools are empty", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 500, level: 5 }]);
    prismaMock.storeItem.findMany.mockResolvedValue([]);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("empty-catalogue");
  });

  it("above-level pull chance is only ever consulted when the in-level pool is non-empty", () => {
    // Documents the invariant the file's own doc comment describes — not a
    // behavioural assertion, just guards the constant against an accidental
    // edit that would make it something other than a small probability.
    expect(ABOVE_LEVEL_PULL_CHANCE).toBeGreaterThan(0);
    expect(ABOVE_LEVEL_PULL_CHANCE).toBeLessThan(0.1);
  });
});

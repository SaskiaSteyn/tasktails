import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { AbGroup, type User } from "@/generated/prisma/client";
import {
  HARD_PITY_THRESHOLD,
  LUCKY_BOX_COST_COINS,
  luckyBoxUrgencyForUser,
  pullLuckyBox,
  rollRarity,
  UNLOCK_LEVEL_BUFFER,
} from "@/lib/gacha";
import { groupGatedData } from "@/lib/study-group";
import { prismaMock } from "@/test/prisma-mock";

/** GACHA-04/05/09 — the weighted roll (pure), the pull transaction, hard pity, and the Group B urgency fabrication, all against the mocked Prisma client (same split economy.test.ts uses for buyXp). */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth);

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

/** `$queryRaw`'s locked-row shape, with a sensible default `pullsSinceLegendary` so tests that don't care about pity don't have to think about it. */
const account = (overrides: Partial<Record<string, unknown>> = {}) => [
  { coins: 500, level: 5, pullsSinceLegendary: 0, ...overrides },
];

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
    prismaMock.storeItem.findMany.mockResolvedValue([storeItem()]);
    prismaMock.inventoryItem.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects a pull with no account", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    const result = await pullLuckyBox("user-1");

    expect(result).toEqual({ ok: false, reason: "no-account" });
  });

  it("rejects a pull without enough coins", async () => {
    prismaMock.$queryRaw.mockResolvedValue(account({ coins: 100 }));

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
    prismaMock.$queryRaw.mockResolvedValue(account());
    prismaMock.storeItem.findMany.mockResolvedValue([
      storeItem({ id: "collar", name: "Red collar", category: "ACCESSORIES" }),
    ]);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.id).toBe("collar");
    expect(result.item.locked).toBe(false);
    expect(result.pet).toBeNull();
    expect(result.spent).toBe(LUCKY_BOX_COST_COINS);
    expect(prismaMock.inventoryItem.create).toHaveBeenCalledWith({
      data: { userId: "user-1", storeItemId: "collar", quantity: 1 },
    });
    expect(prismaMock.inventoryItem.update).not.toHaveBeenCalled();
  });

  it("increments quantity instead of duplicating when the goods item is already owned", async () => {
    prismaMock.$queryRaw.mockResolvedValue(account());
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
    prismaMock.$queryRaw.mockResolvedValue(account({ level: 10 }));
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

  it("draws from the full catalogue for the rarity, with no level filter at all", async () => {
    prismaMock.$queryRaw.mockResolvedValue(account({ level: 1 }));
    prismaMock.storeItem.findMany.mockResolvedValue([
      storeItem({ id: "crown", name: "Crown", category: "ACCESSORIES", levelRequired: 20, rarity: "LEGENDARY" }),
    ]);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.id).toBe("crown");
    // The one and only storeItem query is rarity-only — no levelRequired
    // clause of any kind, confirming the pool isn't capped or split.
    expect(prismaMock.storeItem.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.storeItem.findMany.mock.calls[0][0]).not.toHaveProperty(
      "where.levelRequired",
    );
  });

  it("unlocks immediately when the pull is exactly one level above the account (UNLOCK_LEVEL_BUFFER)", async () => {
    prismaMock.$queryRaw.mockResolvedValue(account({ level: 5 }));
    prismaMock.storeItem.findMany.mockResolvedValue([
      storeItem({ id: "next-tier", levelRequired: 5 + UNLOCK_LEVEL_BUFFER }),
    ]);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.locked).toBe(false);
  });

  it("stays locked when the pull is more than UNLOCK_LEVEL_BUFFER levels above the account", async () => {
    prismaMock.$queryRaw.mockResolvedValue(account({ level: 5 }));
    prismaMock.storeItem.findMany.mockResolvedValue([
      storeItem({ id: "far-tier", levelRequired: 5 + UNLOCK_LEVEL_BUFFER + 1 }),
    ]);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.locked).toBe(true);
  });

  it("reports empty-catalogue rather than crashing when the rarity has nothing in the catalogue", async () => {
    prismaMock.$queryRaw.mockResolvedValue(account());
    prismaMock.storeItem.findMany.mockResolvedValue([]);

    const result = await pullLuckyBox("user-1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("empty-catalogue");
  });

  describe("hard pity (GACHA-05)", () => {
    it("increments pullsSinceLegendary on a non-Legendary pull", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0); // rolls Common, well under pity
      prismaMock.$queryRaw.mockResolvedValue(account({ pullsSinceLegendary: 5 }));

      const result = await pullLuckyBox("user-1");

      expect(result.ok).toBe(true);
      expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { coins: { decrement: LUCKY_BOX_COST_COINS }, pullsSinceLegendary: 6 },
      });
    });

    it("resets pullsSinceLegendary to 0 on a natural Legendary pull", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99); // rolls Legendary on its own merits
      prismaMock.$queryRaw.mockResolvedValue(account({ pullsSinceLegendary: 12 }));
      prismaMock.storeItem.findMany.mockResolvedValue([storeItem({ rarity: "LEGENDARY" })]);

      const result = await pullLuckyBox("user-1");

      expect(result.ok).toBe(true);
      expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { coins: { decrement: LUCKY_BOX_COST_COINS }, pullsSinceLegendary: 0 },
      });
    });

    it("forces Legendary once the threshold is reached, regardless of the roll", async () => {
      // A roll of 0 would naturally be Common — the force has to override it.
      vi.spyOn(Math, "random").mockReturnValue(0);
      prismaMock.$queryRaw.mockResolvedValue(
        account({ pullsSinceLegendary: HARD_PITY_THRESHOLD - 1 }),
      );
      prismaMock.storeItem.findMany.mockResolvedValue([storeItem({ rarity: "LEGENDARY" })]);

      const result = await pullLuckyBox("user-1");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.item.rarity).toBe("LEGENDARY");
      expect(prismaMock.storeItem.findMany.mock.calls[0][0]).toMatchObject({
        where: { rarity: "LEGENDARY" },
      });
      // Forced or natural, the API-facing result carries no trace of pity —
      // no counter, no threshold, no "wasForced" flag.
      expect(result).not.toHaveProperty("pullsSinceLegendary");
      expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { coins: { decrement: LUCKY_BOX_COST_COINS }, pullsSinceLegendary: 0 },
      });
    });

    it("does not force below the threshold", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0); // Common
      prismaMock.$queryRaw.mockResolvedValue(
        account({ pullsSinceLegendary: HARD_PITY_THRESHOLD - 2 }),
      );

      const result = await pullLuckyBox("user-1");

      expect(result.ok).toBe(true);
      expect(prismaMock.storeItem.findMany.mock.calls[0][0]).toMatchObject({
        where: { rarity: "COMMON" },
      });
    });
  });
});

describe("luckyBoxUrgencyForUser", () => {
  it("stays within the 15–30 range the design board's own example (23) needs to fall inside", () => {
    for (const userId of ["user-1", "user-2", "user-3", "user-4", "user-5"]) {
      const { recentPulls } = luckyBoxUrgencyForUser(userId);
      expect(recentPulls).toBeGreaterThanOrEqual(15);
      expect(recentPulls).toBeLessThanOrEqual(30);
    }
  });

  it("is stable for the same user rather than re-randomising per call", () => {
    const first = luckyBoxUrgencyForUser("user-1");
    const second = luckyBoxUrgencyForUser("user-1");
    expect(second).toEqual(first);
  });

  it("differs across users (not a constant disguised as a seed)", () => {
    const values = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map(
        (userId) => luckyBoxUrgencyForUser(userId).recentPulls,
      ),
    );
    expect(values.size).toBeGreaterThan(1);
  });

  it("integrates with groupGatedData exactly like urgencyDataForItems does: null for Group A, data for Group B", async () => {
    function userRow(abGroup: AbGroup): User {
      return { id: "user-1", email: "participant@example.com", abGroup } as User;
    }

    mockedAuth.mockResolvedValue({ user: { email: "participant@example.com" } } as never);

    prismaMock.user.findUnique.mockResolvedValue(userRow(AbGroup.A));
    const forGroupA = await groupGatedData(() => luckyBoxUrgencyForUser("user-1"));
    expect(forGroupA).toBeNull();

    prismaMock.user.findUnique.mockResolvedValue(userRow(AbGroup.B));
    const forGroupB = await groupGatedData(() => luckyBoxUrgencyForUser("user-1"));
    expect(forGroupB).not.toBeNull();
    expect(forGroupB?.recentPulls).toBeGreaterThanOrEqual(15);
  });
});

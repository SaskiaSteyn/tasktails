import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { AbGroup, type User } from "@/generated/prisma/client";
import {
  buyLuckyBox,
  HARD_PITY_THRESHOLD,
  luckyBoxUrgencyForUser,
  openLuckyBox,
  rollRarity,
  UNLOCK_LEVEL_BUFFER,
} from "@/lib/gacha";
import { luckyBox } from "@/lib/lucky-boxes";
import { groupGatedData } from "@/lib/study-group";
import { prismaMock } from "@/test/prisma-mock";

/** GACHA-04/05/09 — the weighted roll (pure), the pull transaction, hard pity, and the Group B urgency fabrication, all against the mocked Prisma client (same split economy.test.ts uses for buyXp). */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth);

const storeItem = (overrides: Partial<Record<string, unknown>> = {}) =>
  ({
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

describe("buyLuckyBox", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
    prismaMock.ownedLuckyBox.create.mockResolvedValue({ id: "box-1" } as never);
    prismaMock.userEconomy.update.mockResolvedValue({ coins: 0 } as never);
  });

  it("debits the box's own price and shelves it unopened, rolling nothing", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 500 }]);

    const result = await buyLuckyBox("user-1", "HAUL");

    expect(result).toMatchObject({ ok: true, boxId: "box-1" });
    expect(prismaMock.ownedLuckyBox.create).toHaveBeenCalledWith({
      data: { userId: "user-1", boxKey: "HAUL", coinSpent: 200 },
    });
    // The purchase is tracked, in the same transaction as the buy.
    expect(prismaMock.telemetryEvent.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        eventType: "LUCKY_BOX_PURCHASED",
        payload: {
          boxId: "box-1",
          boxKey: "HAUL",
          name: "Lucky Haul",
          itemCount: 5,
          coinSpent: 200,
        },
      },
    });
    expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { coins: { decrement: luckyBox("HAUL").coinPrice } },
    });
    expect(prismaMock.storeItem.findMany).not.toHaveBeenCalled();
  });

  it("rejects a buy without enough coins, and shelves nothing", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 100 }]);

    const result = await buyLuckyBox("user-1", "TROVE");

    expect(result).toEqual({
      ok: false,
      reason: "insufficient-coins",
      coins: 100,
      shortfall: luckyBox("TROVE").coinPrice - 100,
    });
    expect(prismaMock.ownedLuckyBox.create).not.toHaveBeenCalled();
    expect(prismaMock.telemetryEvent.create).not.toHaveBeenCalled();
  });

  it("rejects a buy with no account", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    expect(await buyLuckyBox("user-1", "PARCEL")).toEqual({
      ok: false,
      reason: "no-account",
    });
  });
});

describe("openLuckyBox", () => {
  /** The two locked reads, in order: the box row, then the account row. */
  function rows(
    box: Partial<Record<string, unknown>> | null,
    economy: Partial<Record<string, unknown>> = {},
  ) {
    prismaMock.$queryRaw
      .mockResolvedValueOnce(
        box
          ? [{ boxKey: "PARCEL", openedAt: null, results: null, ...box }]
          : [],
      )
      .mockResolvedValueOnce(account(economy));
  }

  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
    prismaMock.storeItem.findMany.mockResolvedValue([
      storeItem({ id: "common", rarity: "COMMON" }),
      storeItem({ id: "rare", rarity: "RARE" }),
      storeItem({ id: "epic", rarity: "EPIC" }),
      storeItem({ id: "legendary", rarity: "LEGENDARY" }),
    ]);
    prismaMock.inventoryItem.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects someone else's (or a missing) box", async () => {
    rows(null);

    expect(await openLuckyBox("user-1", "box-1")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("rolls one item per card, grants each, and stamps the box opened with the results", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // Common, not shiny
    rows({ boxKey: "HAUL" });

    const result = await openLuckyBox("user-1", "box-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(5);
    // One grant per card (the mocked lookup never sees the earlier creates).
    expect(prismaMock.inventoryItem.create).toHaveBeenCalledTimes(5);
    expect(prismaMock.ownedLuckyBox.update).toHaveBeenCalledWith({
      where: { id: "box-1" },
      data: {
        openedAt: expect.any(Date),
        results: Array(5).fill({
          storeItemId: "common",
          shiny: false,
          locked: false,
        }),
      },
    });
  });

  it("is idempotent — an opened box returns its stored results and grants nothing", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        boxKey: "PARCEL",
        openedAt: new Date(),
        results: [{ storeItemId: "epic", shiny: true, locked: false }],
      },
    ]);

    const result = await openLuckyBox("user-1", "box-1");

    expect(result.ok && result.items).toMatchObject([
      { id: "epic", shiny: true },
    ]);
    expect(prismaMock.inventoryItem.create).not.toHaveBeenCalled();
    expect(prismaMock.pet.create).not.toHaveBeenCalled();
    expect(prismaMock.ownedLuckyBox.update).not.toHaveBeenCalled();
    expect(prismaMock.userEconomy.update).not.toHaveBeenCalled();
  });

  it("rolls shiny at the box's own odds, and keeps shinies out of plain stacks", async () => {
    // Just under 1 in 60 — shiny for a Parcel.
    vi.spyOn(Math, "random").mockReturnValue(1 / 60 - 0.001);
    rows({ boxKey: "PARCEL" });

    const result = await openLuckyBox("user-1", "box-1");

    expect(result.ok && result.items[0].shiny).toBe(true);
    expect(prismaMock.inventoryItem.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        storeItemId: "common",
        equippedToPetId: null,
        shiny: true,
      },
    });
  });

  it("adopts a Pet for an animal", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    prismaMock.storeItem.findMany.mockResolvedValue([
      storeItem({ id: "fox", category: "ANIMALS", rarity: "COMMON" }),
    ]);
    rows({ boxKey: "PARCEL" });

    await openLuckyBox("user-1", "box-1");

    expect(prismaMock.pet.create).toHaveBeenCalled();
    expect(prismaMock.inventoryItem.create).not.toHaveBeenCalled();
  });

  it("locks an item more than UNLOCK_LEVEL_BUFFER levels above the account", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    prismaMock.storeItem.findMany.mockResolvedValue([
      storeItem({ id: "far", levelRequired: 5 + UNLOCK_LEVEL_BUFFER + 1 }),
      storeItem({
        id: "near",
        levelRequired: 5 + UNLOCK_LEVEL_BUFFER,
        rarity: "RARE",
      }),
    ]);
    rows({ boxKey: "PARCEL" }, { level: 5 });

    const result = await openLuckyBox("user-1", "box-1");

    expect(result.ok && result.items[0]).toMatchObject({
      id: "far",
      locked: true,
    });
  });

  it("grants nothing when a rolled rarity has no items", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    prismaMock.storeItem.findMany.mockResolvedValue([]);
    rows({ boxKey: "HAUL" });

    const result = await openLuckyBox("user-1", "box-1");

    expect(result).toMatchObject({ ok: false, reason: "empty-catalogue" });
    expect(prismaMock.inventoryItem.create).not.toHaveBeenCalled();
    expect(prismaMock.ownedLuckyBox.update).not.toHaveBeenCalled();
  });

  describe("hard pity (GACHA-05)", () => {
    it("counts every card as a pull", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0); // Common every time
      rows({ boxKey: "HAUL" }, { pullsSinceLegendary: 5 });

      await openLuckyBox("user-1", "box-1");

      expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { pullsSinceLegendary: 10 },
      });
    });

    it("forces Legendary on the card that reaches the threshold, mid-box, and resets the count", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0); // would be Common
      rows(
        { boxKey: "BUNDLE" },
        { pullsSinceLegendary: HARD_PITY_THRESHOLD - 2 },
      );

      const result = await openLuckyBox("user-1", "box-1");

      expect(result.ok && result.items.map((item) => item.rarity)).toEqual([
        "COMMON",
        "LEGENDARY",
        "COMMON",
      ]);
      // Nothing about pity reaches the result.
      expect(result).not.toHaveProperty("pullsSinceLegendary");
      expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { pullsSinceLegendary: 1 },
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
      return {
        id: "user-1",
        email: "participant@example.com",
        abGroup,
      } as User;
    }

    mockedAuth.mockResolvedValue({
      user: { email: "participant@example.com" },
    } as never);

    prismaMock.user.findUnique.mockResolvedValue(userRow(AbGroup.A));
    const forGroupA = await groupGatedData(() =>
      luckyBoxUrgencyForUser("user-1"),
    );
    expect(forGroupA).toBeNull();

    prismaMock.user.findUnique.mockResolvedValue(userRow(AbGroup.B));
    const forGroupB = await groupGatedData(() =>
      luckyBoxUrgencyForUser("user-1"),
    );
    expect(forGroupB).not.toBeNull();
    expect(forGroupB?.recentPulls).toBeGreaterThanOrEqual(15);
  });
});

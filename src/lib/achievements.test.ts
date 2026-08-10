import { beforeEach, describe, expect, it, vi } from "vitest";

import { achievementsForUser, evaluateAchievements } from "@/lib/achievements";
import { prismaMock } from "@/test/prisma-mock";

/**
 * PRO-18 — the criteria engine (11 types across Streaks/Tasks/Items/Petting
 * Zoo) and the unlock-and-pay-out pipeline, exercised against the mocked
 * Prisma client so real query shapes are asserted, same pattern
 * `economy.test.ts` uses.
 *
 * `@/auth` is mocked because `economy.ts` (imported transitively via
 * `grantAchievementReward`) imports it for `currentEconomy`; nothing here
 * signs in.
 */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

type SnapshotInput = {
  streak?: number;
  lifetimePetInteractions?: number;
  lifetimeFeedInteractions?: number;
  completedTasks?: { complexityTier: number; completedAt: Date }[];
  goods?: { storeItemId: string; storeItem: { category: string; rarity: string | null } }[];
  pets?: { storeItemId: string; timesPetted: number; storeItem: { rarity: string | null } }[];
  catalogue?: { category: string; count: number }[];
};

/** Stubs every read `buildSnapshot()` makes, in one call. */
function setupSnapshot(input: SnapshotInput = {}) {
  prismaMock.userEconomy.findUnique.mockResolvedValue({
    streak: input.streak ?? 0,
    lifetimePetInteractions: input.lifetimePetInteractions ?? 0,
    lifetimeFeedInteractions: input.lifetimeFeedInteractions ?? 0,
  } as never);
  prismaMock.task.findMany.mockResolvedValue((input.completedTasks ?? []) as never);
  prismaMock.inventoryItem.findMany.mockResolvedValue((input.goods ?? []) as never);
  // `petsForUser()` decays each row via `decayedStateFor()`, which needs
  // `happiness`/`hunger`/`lastInteractedAt` — filled with inert defaults
  // here so tests only have to specify what they actually care about.
  prismaMock.pet.findMany.mockResolvedValue(
    (input.pets ?? []).map((pet) => ({
      happiness: 100,
      hunger: 0,
      lastInteractedAt: new Date(2026, 0, 1),
      ...pet,
    })) as never,
  );
  // `groupBy`'s generic, overloaded signature confuses `mockResolvedValue`'s
  // own overload resolution through `DeepMockProxy` — narrowed to the one
  // method this file needs before calling it, rather than the whole
  // `PrismaClient["storeItem"]["groupBy"]` type.
  (
    prismaMock.storeItem.groupBy as unknown as {
      mockResolvedValue: (value: unknown) => void;
    }
  ).mockResolvedValue(
    (input.catalogue ?? []).map((row) => ({
      category: row.category,
      _count: { _all: row.count },
    })),
  );
}

function setupCatalogue(achievements: { id: string; criteria: unknown; xpReward: number }[]) {
  prismaMock.achievement.findMany.mockResolvedValue(achievements as never);
}

describe("evaluateAchievements", () => {
  beforeEach(() => {
    prismaMock.userAchievement.findMany.mockResolvedValue([]);
    prismaMock.userAchievement.createMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
  });

  it("returns nothing when the account has no economy row", async () => {
    setupSnapshot({});
    prismaMock.userEconomy.findUnique.mockResolvedValue(null);
    setupCatalogue([]);

    const result = await evaluateAchievements("ghost");

    expect(result).toEqual({ unlocked: [], levelUp: null });
    expect(prismaMock.userAchievement.createMany).not.toHaveBeenCalled();
  });

  it("unlocks STREAK_DAYS once the threshold is met and pays out its XP", async () => {
    setupSnapshot({ streak: 7 });
    setupCatalogue([
      { id: "a1", criteria: { type: "STREAK_DAYS", threshold: 7 }, xpReward: 75 },
    ]);
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);

    const result = await evaluateAchievements("user-1");

    expect(result.unlocked.map((a) => a.id)).toEqual(["a1"]);
    expect(prismaMock.userAchievement.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", achievementId: "a1" }],
      skipDuplicates: true,
    });
    // 75 XP crosses level 2 (40 XP threshold).
    expect(result.levelUp?.to).toBe(2);
  });

  it("does not re-unlock an achievement the account already has", async () => {
    setupSnapshot({ streak: 30 });
    setupCatalogue([
      { id: "a1", criteria: { type: "STREAK_DAYS", threshold: 7 }, xpReward: 75 },
    ]);
    prismaMock.userAchievement.findMany.mockResolvedValue([
      { achievementId: "a1" },
    ] as never);

    const result = await evaluateAchievements("user-1");

    expect(result).toEqual({ unlocked: [], levelUp: null });
    expect(prismaMock.userAchievement.createMany).not.toHaveBeenCalled();
  });

  it("sums XP across every achievement unlocked in one call", async () => {
    setupSnapshot({ streak: 30 });
    setupCatalogue([
      { id: "a1", criteria: { type: "STREAK_DAYS", threshold: 5 }, xpReward: 50 },
      { id: "a2", criteria: { type: "STREAK_DAYS", threshold: 7 }, xpReward: 75 },
    ]);
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);

    await evaluateAchievements("user-1");

    // grantAchievementReward's xpWrite increments by the combined total.
    const data = prismaMock.userEconomy.update.mock.calls[0][0].data as never as {
      xp: { increment: number };
    };
    expect(data.xp.increment).toBe(125);
  });

  it("RARITY_OWNED: unlocks off an owned good, not an owned pet, for a goods category", async () => {
    setupSnapshot({
      goods: [
        { storeItemId: "i1", storeItem: { category: "FOOD", rarity: "RARE" } },
      ],
    });
    setupCatalogue([
      {
        id: "a1",
        criteria: { type: "RARITY_OWNED", category: "FOOD", rarity: "RARE" },
        xpReward: 40,
      },
    ]);
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);

    const result = await evaluateAchievements("user-1");

    expect(result.unlocked.map((a) => a.id)).toEqual(["a1"]);
  });

  it("RARITY_OWNED: an ANIMALS category checks owned pets, not inventory", async () => {
    setupSnapshot({
      goods: [{ storeItemId: "i1", storeItem: { category: "FOOD", rarity: "RARE" } }],
      pets: [{ storeItemId: "p1", timesPetted: 0, storeItem: { rarity: "EPIC" } }],
    });
    setupCatalogue([
      {
        id: "a1",
        criteria: { type: "RARITY_OWNED", category: "ANIMALS", rarity: "EPIC" },
        xpReward: 100,
      },
    ]);
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);

    const result = await evaluateAchievements("user-1");

    expect(result.unlocked.map((a) => a.id)).toEqual(["a1"]);
  });

  it("CATEGORY_FULLY_OWNED: needs every catalogue item in that category owned", async () => {
    setupSnapshot({
      goods: [
        { storeItemId: "i1", storeItem: { category: "FOOD", rarity: "COMMON" } },
      ],
      catalogue: [{ category: "FOOD", count: 2 }],
    });
    setupCatalogue([
      { id: "a1", criteria: { type: "CATEGORY_FULLY_OWNED", category: "FOOD" }, xpReward: 150 },
    ]);

    expect((await evaluateAchievements("user-1")).unlocked).toEqual([]);

    // Owning the second item completes the category.
    setupSnapshot({
      goods: [
        { storeItemId: "i1", storeItem: { category: "FOOD", rarity: "COMMON" } },
        { storeItemId: "i2", storeItem: { category: "FOOD", rarity: "RARE" } },
      ],
      catalogue: [{ category: "FOOD", count: 2 }],
    });
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);

    const result = await evaluateAchievements("user-1");
    expect(result.unlocked.map((a) => a.id)).toEqual(["a1"]);
  });

  it("ALL_ITEMS_OWNED: sums every category's catalogue count as the target", async () => {
    setupSnapshot({
      goods: [{ storeItemId: "i1", storeItem: { category: "FOOD", rarity: "COMMON" } }],
      pets: [{ storeItemId: "p1", timesPetted: 0, storeItem: { rarity: "COMMON" } }],
      catalogue: [
        { category: "FOOD", count: 1 },
        { category: "ANIMALS", count: 1 },
      ],
    });
    setupCatalogue([{ id: "a1", criteria: { type: "ALL_ITEMS_OWNED" }, xpReward: 1000 }]);
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);

    const result = await evaluateAchievements("user-1");
    expect(result.unlocked.map((a) => a.id)).toEqual(["a1"]);
  });

  it("TASKS_COMPLETED_IN_DAY: counts the busiest single calendar day, not the lifetime total", async () => {
    const day1 = new Date(2026, 6, 1, 9);
    const day2 = new Date(2026, 6, 2, 9);
    setupSnapshot({
      completedTasks: [
        { complexityTier: 1, completedAt: day1 },
        { complexityTier: 1, completedAt: new Date(2026, 6, 1, 14) },
        { complexityTier: 1, completedAt: day2 },
      ],
    });
    setupCatalogue([
      { id: "a1", criteria: { type: "TASKS_COMPLETED_IN_DAY", threshold: 3 }, xpReward: 25 },
    ]);

    // Best day has 2, not the 3-task lifetime total.
    expect((await evaluateAchievements("user-1")).unlocked).toEqual([]);
  });

  it("TASK_TIER_VARIETY: requires all 5 tiers, not just 5 completions", async () => {
    setupSnapshot({
      completedTasks: [1, 1, 1, 1, 1].map((tier) => ({
        complexityTier: tier,
        completedAt: new Date(2026, 6, 1),
      })),
    });
    setupCatalogue([
      { id: "a1", criteria: { type: "TASK_TIER_VARIETY" }, xpReward: 80 },
    ]);
    expect((await evaluateAchievements("user-1")).unlocked).toEqual([]);

    setupSnapshot({
      completedTasks: [1, 2, 3, 4, 5].map((tier) => ({
        complexityTier: tier,
        completedAt: new Date(2026, 6, 1),
      })),
    });
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);
    expect((await evaluateAchievements("user-1")).unlocked.map((a) => a.id)).toEqual(["a1"]);
  });

  it("TASKS_COMPLETED_BY_TIER: only counts completions of the matching tier", async () => {
    setupSnapshot({
      completedTasks: [
        { complexityTier: 5, completedAt: new Date(2026, 6, 1) },
        { complexityTier: 1, completedAt: new Date(2026, 6, 2) },
      ],
    });
    setupCatalogue([
      {
        id: "a1",
        criteria: { type: "TASKS_COMPLETED_BY_TIER", tier: 5, threshold: 1 },
        xpReward: 750,
      },
    ]);
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);

    expect((await evaluateAchievements("user-1")).unlocked.map((a) => a.id)).toEqual(["a1"]);
  });

  it("PET_INTERACTIONS / FEED_INTERACTIONS read the lifetime counters", async () => {
    setupSnapshot({ lifetimePetInteractions: 50, lifetimeFeedInteractions: 12 });
    setupCatalogue([
      { id: "pet50", criteria: { type: "PET_INTERACTIONS", threshold: 50 }, xpReward: 60 },
      { id: "feed50", criteria: { type: "FEED_INTERACTIONS", threshold: 50 }, xpReward: 60 },
    ]);
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);

    const result = await evaluateAchievements("user-1");
    expect(result.unlocked.map((a) => a.id)).toEqual(["pet50"]);
  });

  it("ANIMAL_VARIETY_PETTED: needs every owned pet petted at least once, and at least one pet owned", async () => {
    setupCatalogue([
      { id: "a1", criteria: { type: "ANIMAL_VARIETY_PETTED" }, xpReward: 100 },
    ]);

    // No pets owned — vacuously not unlocked.
    setupSnapshot({ pets: [] });
    expect((await evaluateAchievements("user-1")).unlocked).toEqual([]);

    // One pet, never petted.
    setupSnapshot({
      pets: [{ storeItemId: "p1", timesPetted: 0, storeItem: { rarity: "COMMON" } }],
    });
    expect((await evaluateAchievements("user-1")).unlocked).toEqual([]);

    // Two pets, only one petted.
    setupSnapshot({
      pets: [
        { storeItemId: "p1", timesPetted: 3, storeItem: { rarity: "COMMON" } },
        { storeItemId: "p2", timesPetted: 0, storeItem: { rarity: "RARE" } },
      ],
    });
    expect((await evaluateAchievements("user-1")).unlocked).toEqual([]);

    // Both petted.
    setupSnapshot({
      pets: [
        { storeItemId: "p1", timesPetted: 3, storeItem: { rarity: "COMMON" } },
        { storeItemId: "p2", timesPetted: 1, storeItem: { rarity: "RARE" } },
      ],
    });
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);
    expect((await evaluateAchievements("user-1")).unlocked.map((a) => a.id)).toEqual(["a1"]);
  });

  it("ANIMAL_VARIETY_OWNED: needs a distinct owned animal per catalogue slot", async () => {
    setupCatalogue([
      { id: "a1", criteria: { type: "ANIMAL_VARIETY_OWNED" }, xpReward: 250 },
    ]);

    setupSnapshot({
      pets: [{ storeItemId: "p1", timesPetted: 0, storeItem: { rarity: "COMMON" } }],
      catalogue: [{ category: "ANIMALS", count: 3 }],
    });
    expect((await evaluateAchievements("user-1")).unlocked).toEqual([]);

    setupSnapshot({
      pets: [
        { storeItemId: "p1", timesPetted: 0, storeItem: { rarity: "COMMON" } },
        { storeItemId: "p2", timesPetted: 0, storeItem: { rarity: "EPIC" } },
        { storeItemId: "p3", timesPetted: 0, storeItem: { rarity: "EPIC" } },
      ],
      catalogue: [{ category: "ANIMALS", count: 3 }],
    });
    prismaMock.$queryRaw.mockResolvedValue([{ xp: 0 }]);
    prismaMock.userEconomy.update.mockResolvedValue({} as never);
    expect((await evaluateAchievements("user-1")).unlocked.map((a) => a.id)).toEqual(["a1"]);
  });
});

describe("achievementsForUser", () => {
  beforeEach(() => {
    prismaMock.userAchievement.findMany.mockResolvedValue([]);
  });

  it("attaches category, derived from the criterion type", async () => {
    setupSnapshot({});
    prismaMock.achievement.findMany.mockResolvedValue([
      { id: "a1", key: "k1", name: "N", description: "D", criteria: { type: "STREAK_DAYS", threshold: 5 }, xpReward: 50 },
      { id: "a2", key: "k2", name: "N", description: "D", criteria: { type: "PET_INTERACTIONS", threshold: 50 }, xpReward: 60 },
    ] as never);

    const result = await achievementsForUser("user-1");

    expect(result.find((a) => a.id === "a1")?.category).toBe("STREAKS");
    expect(result.find((a) => a.id === "a2")?.category).toBe("PETTING_ZOO");
  });

  it("shows progress while locked, and freezes it to null once earned", async () => {
    setupSnapshot({ streak: 3 });
    prismaMock.achievement.findMany.mockResolvedValue([
      { id: "a1", key: "k1", name: "N", description: "D", criteria: { type: "STREAK_DAYS", threshold: 5 }, xpReward: 50 },
    ] as never);

    const locked = await achievementsForUser("user-1");
    expect(locked[0].unlockedAt).toBeNull();
    expect(locked[0].progress).toEqual({ current: 3, target: 5 });

    prismaMock.userAchievement.findMany.mockResolvedValue([
      { achievementId: "a1", unlockedAt: new Date(2026, 6, 1) },
    ] as never);

    const earned = await achievementsForUser("user-1");
    expect(earned[0].unlockedAt).not.toBeNull();
    expect(earned[0].progress).toBeNull();
  });

  it("gives a binary criterion (RARITY_OWNED) no progress bar even while locked", async () => {
    setupSnapshot({});
    prismaMock.achievement.findMany.mockResolvedValue([
      {
        id: "a1",
        key: "k1",
        name: "N",
        description: "D",
        criteria: { type: "RARITY_OWNED", category: "FOOD", rarity: "COMMON" },
        xpReward: 15,
      },
    ] as never);

    const result = await achievementsForUser("user-1");
    expect(result[0].unlockedAt).toBeNull();
    expect(result[0].progress).toBeNull();
  });
});

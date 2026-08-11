import type {
  Achievement,
  StoreItemCategory,
  StoreItemRarity,
} from "@/generated/prisma/client";
import { grantAchievementReward, type LevelUpEvent } from "@/lib/economy";
import { allInventoryForUser } from "@/lib/inventory";
import { startOfDay } from "@/lib/day";
import { petsForUser } from "@/lib/pets";
import { prisma } from "@/lib/prisma";
import { catalogueItemCounts } from "@/lib/store";
import { completedTaskFactsForUser } from "@/lib/tasks";

/**
 * Every read and write of the achievement catalogue and a user's unlocks
 * (INF-19, PRO-07/08/09, expanded PRO-18). Nothing outside this module
 * touches `prisma.achievement`/`prisma.userAchievement`, same rule as
 * `tasks.ts`, `economy.ts` and the rest.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { Achievement };

/**
 * The shape `Achievement.criteria` is stored as. PRO-18 replaced PRO-09's
 * original 4-type union (TASKS_COMPLETED/LEVEL_REACHED/STREAK_DAYS/
 * ITEMS_PURCHASED — none of which the approved `Achievements.pdf` catalogue
 * uses) with these 11, one per distinct rule the PDF's 38 achievements need.
 */
export type AchievementCriterion =
  | { type: "STREAK_DAYS"; threshold: number }
  | { type: "TASKS_COMPLETED_IN_DAY"; threshold: number }
  | { type: "TASK_TIER_VARIETY" }
  | { type: "TASKS_COMPLETED_BY_TIER"; tier: number; threshold: number }
  | {
      type: "RARITY_OWNED";
      category: StoreItemCategory;
      rarity: StoreItemRarity;
    }
  | { type: "CATEGORY_FULLY_OWNED"; category: StoreItemCategory }
  | { type: "ALL_ITEMS_OWNED" }
  | { type: "PET_INTERACTIONS"; threshold: number }
  | { type: "FEED_INTERACTIONS"; threshold: number }
  | { type: "ANIMAL_VARIETY_PETTED" }
  | { type: "ANIMAL_VARIETY_OWNED" };

/** The Achievements screen's 4 category tabs (`design_handoff/ADDENDUM-achievements.md`), plus "All". */
export type AchievementCategory = "STREAKS" | "TASKS" | "PETTING_ZOO" | "ITEMS";

/**
 * Category is derived from the criterion type rather than stored as its own
 * `Achievement` column — every remaining type maps to exactly one category,
 * so a separate column could only ever drift from this table, never add
 * information.
 */
const CRITERION_CATEGORY: Record<
  AchievementCriterion["type"],
  AchievementCategory
> = {
  STREAK_DAYS: "STREAKS",
  TASKS_COMPLETED_IN_DAY: "TASKS",
  TASK_TIER_VARIETY: "TASKS",
  TASKS_COMPLETED_BY_TIER: "TASKS",
  RARITY_OWNED: "ITEMS",
  CATEGORY_FULLY_OWNED: "ITEMS",
  ALL_ITEMS_OWNED: "ITEMS",
  PET_INTERACTIONS: "PETTING_ZOO",
  FEED_INTERACTIONS: "PETTING_ZOO",
  ANIMAL_VARIETY_PETTED: "PETTING_ZOO",
  ANIMAL_VARIETY_OWNED: "PETTING_ZOO",
};

export function categoryOf(
  achievement: Pick<Achievement, "criteria">,
): AchievementCategory {
  const criterion = achievement.criteria as AchievementCriterion;
  return CRITERION_CATEGORY[criterion.type];
}

/** Current/target for the Achievements screen's "locked with progress" row. Null for binary criteria (e.g. `RARITY_OWNED`), where a bar would be meaningless. */
export type AchievementProgress = { current: number; target: number } | null;

/** PRO-07/08's read shape — the catalogue plus this user's unlock state. */
export type AchievementWithState = Achievement & {
  unlockedAt: Date | null;
  category: AchievementCategory;
  progress: AchievementProgress;
};

/**
 * Everything the criteria engine needs, read once per call rather than once
 * per achievement — with 38 catalogue entries checked on every trigger
 * (task/subtask completion, checkout, pet, feed, customize), a per-
 * achievement query would mean dozens of round trips per event instead of
 * this fixed handful.
 */
type Snapshot = {
  streak: number;
  lifetimePetInteractions: number;
  lifetimeFeedInteractions: number;
  completedTasks: { complexityTier: number; completedAt: Date }[];
  ownedGoods: { storeItemId: string; category: StoreItemCategory; rarity: StoreItemRarity | null }[];
  ownedPets: { storeItemId: string; rarity: StoreItemRarity | null; timesPetted: number }[];
  catalogue: Record<StoreItemCategory, number>;
};

async function buildSnapshot(userId: string): Promise<Snapshot | null> {
  const [economy, completedTasks, goods, pets, catalogue] = await Promise.all([
    prisma.userEconomy.findUnique({
      where: { userId },
      select: {
        streak: true,
        lifetimePetInteractions: true,
        lifetimeFeedInteractions: true,
      },
    }),
    completedTaskFactsForUser(userId),
    allInventoryForUser(userId),
    petsForUser(userId),
    catalogueItemCounts(),
  ]);

  if (!economy) return null;

  return {
    streak: economy.streak,
    lifetimePetInteractions: economy.lifetimePetInteractions,
    lifetimeFeedInteractions: economy.lifetimeFeedInteractions,
    completedTasks,
    ownedGoods: goods.map((g) => ({
      storeItemId: g.storeItemId,
      category: g.storeItem.category,
      rarity: g.storeItem.rarity,
    })),
    ownedPets: pets.map((p) => ({
      storeItemId: p.storeItemId,
      rarity: p.storeItem.rarity,
      timesPetted: p.timesPetted,
    })),
    catalogue,
  };
}

function maxTasksCompletedInADay(tasks: { completedAt: Date }[]): number {
  const perDay = new Map<number, number>();
  for (const task of tasks) {
    const key = startOfDay(task.completedAt).getTime();
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  return perDay.size === 0 ? 0 : Math.max(...perDay.values());
}

const ALL_TIERS = [1, 2, 3, 4, 5];

function tiersTouched(tasks: { complexityTier: number }[]): number {
  const seen = new Set(tasks.map((task) => task.complexityTier));
  return ALL_TIERS.filter((tier) => seen.has(tier)).length;
}

function countByTier(tasks: { complexityTier: number }[], tier: number): number {
  return tasks.filter((task) => task.complexityTier === tier).length;
}

function ownsRarityInCategory(
  snapshot: Snapshot,
  category: StoreItemCategory,
  rarity: StoreItemRarity,
): boolean {
  if (category === "ANIMALS") {
    return snapshot.ownedPets.some((pet) => pet.rarity === rarity);
  }
  return snapshot.ownedGoods.some(
    (item) => item.category === category && item.rarity === rarity,
  );
}

function distinctOwnedIdsInCategory(
  snapshot: Snapshot,
  category: StoreItemCategory,
): Set<string> {
  if (category === "ANIMALS") {
    return new Set(snapshot.ownedPets.map((pet) => pet.storeItemId));
  }
  return new Set(
    snapshot.ownedGoods
      .filter((item) => item.category === category)
      .map((item) => item.storeItemId),
  );
}

function distinctOwnedIdsTotal(snapshot: Snapshot): Set<string> {
  return new Set([
    ...snapshot.ownedGoods.map((item) => item.storeItemId),
    ...snapshot.ownedPets.map((pet) => pet.storeItemId),
  ]);
}

function totalCatalogueCount(catalogue: Record<StoreItemCategory, number>): number {
  return Object.values(catalogue).reduce((sum, count) => sum + count, 0);
}

type CriterionResult = { unlocked: boolean; progress: AchievementProgress };

/** Grades one criterion against a snapshot. The whole engine — every other function above exists to feed this one cheaply. */
function evaluateCriterion(
  criterion: AchievementCriterion,
  snapshot: Snapshot,
): CriterionResult {
  switch (criterion.type) {
    case "STREAK_DAYS": {
      const current = snapshot.streak;
      return {
        unlocked: current >= criterion.threshold,
        progress: { current, target: criterion.threshold },
      };
    }
    case "TASKS_COMPLETED_IN_DAY": {
      const current = maxTasksCompletedInADay(snapshot.completedTasks);
      return {
        unlocked: current >= criterion.threshold,
        progress: { current, target: criterion.threshold },
      };
    }
    case "TASK_TIER_VARIETY": {
      const current = tiersTouched(snapshot.completedTasks);
      return {
        unlocked: current >= ALL_TIERS.length,
        progress: { current, target: ALL_TIERS.length },
      };
    }
    case "TASKS_COMPLETED_BY_TIER": {
      const current = countByTier(snapshot.completedTasks, criterion.tier);
      return {
        unlocked: current >= criterion.threshold,
        progress: { current, target: criterion.threshold },
      };
    }
    case "RARITY_OWNED": {
      // Binary — you either own one or you don't, so a "0/1" bar would be
      // meaningless. Locked rows for this criterion show no progress track.
      return {
        unlocked: ownsRarityInCategory(snapshot, criterion.category, criterion.rarity),
        progress: null,
      };
    }
    case "CATEGORY_FULLY_OWNED": {
      const target = snapshot.catalogue[criterion.category] ?? 0;
      const current = distinctOwnedIdsInCategory(snapshot, criterion.category).size;
      return { unlocked: target > 0 && current >= target, progress: { current, target } };
    }
    case "ALL_ITEMS_OWNED": {
      const target = totalCatalogueCount(snapshot.catalogue);
      const current = distinctOwnedIdsTotal(snapshot).size;
      return { unlocked: target > 0 && current >= target, progress: { current, target } };
    }
    case "PET_INTERACTIONS": {
      const current = snapshot.lifetimePetInteractions;
      return {
        unlocked: current >= criterion.threshold,
        progress: { current, target: criterion.threshold },
      };
    }
    case "FEED_INTERACTIONS": {
      const current = snapshot.lifetimeFeedInteractions;
      return {
        unlocked: current >= criterion.threshold,
        progress: { current, target: criterion.threshold },
      };
    }
    case "ANIMAL_VARIETY_PETTED": {
      const target = snapshot.ownedPets.length;
      const current = snapshot.ownedPets.filter((pet) => pet.timesPetted > 0).length;
      // Requires owning at least one pet — an empty sanctuary is not
      // vacuously "every pet petted".
      return { unlocked: target > 0 && current >= target, progress: { current, target } };
    }
    case "ANIMAL_VARIETY_OWNED": {
      const target = snapshot.catalogue.ANIMALS ?? 0;
      const current = distinctOwnedIdsInCategory(snapshot, "ANIMALS").size;
      return { unlocked: target > 0 && current >= target, progress: { current, target } };
    }
    default:
      // `criteria` is a Prisma `Json` column read back with `as
      // AchievementCriterion` — a type assertion, not a runtime guarantee.
      // A row seeded by an older/newer version of this file's `criteria`
      // union (or a partially-applied seed) would otherwise fall through
      // with no case matched, returning `undefined` here and crashing every
      // caller's `.map` over the *whole* catalogue for the one bad row.
      // Treating it as unlocked-but-unmet keeps the rest of the list alive.
      return { unlocked: false, progress: null };
  }
}

/**
 * Every achievement, earned or not, for the Profile preview strip and the
 * full Achievements screen. `progress` is only populated for *locked*
 * achievements — once earned, the badge shows a check, not a bar, and stays
 * earned even if live ownership would later drop below the original
 * threshold (e.g. an item counted toward "own every accessory" gets sold).
 */
export async function achievementsForUser(
  userId: string,
): Promise<AchievementWithState[]> {
  const [achievements, unlocked, snapshot] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { id: "asc" } }),
    prisma.userAchievement.findMany({ where: { userId } }),
    buildSnapshot(userId),
  ]);

  const unlockedAt = new Map(
    unlocked.map((row) => [row.achievementId, row.unlockedAt]),
  );

  return achievements.map((achievement) => {
    const criterion = achievement.criteria as AchievementCriterion;
    const earnedAt = unlockedAt.get(achievement.id) ?? null;
    const evaluated = snapshot
      ? evaluateCriterion(criterion, snapshot)
      : { unlocked: false, progress: null };

    return {
      ...achievement,
      unlockedAt: earnedAt,
      category: CRITERION_CATEGORY[criterion.type],
      progress: earnedAt ? null : evaluated.progress,
    };
  });
}

/** What a trigger event (task completion, purchase, pet interaction) unlocked, and the level-up its XP reward caused, if any. */
export type AchievementUnlockResult = {
  unlocked: Achievement[];
  levelUp: LevelUpEvent | null;
};

/**
 * PRO-09, expanded PRO-18 — evaluates the whole catalogue against a user's
 * current progress, unlocks whatever is newly met, and pays out the XP
 * `Achievements.pdf` seeded for each (`grantAchievementReward()`, which
 * bypasses the daily XP cap — see that function's own doc comment).
 *
 * Called after task completion, subtask completion, checkout, and all three
 * pet-interaction routes — the same five call sites PRO-09 established.
 * Re-evaluates the whole catalogue on every call rather than only the
 * criterion types that trigger could plausibly move; the snapshot this reads
 * from is built once per call regardless of catalogue size, so this stays a
 * fixed, small number of queries rather than one per achievement.
 *
 * Idempotent by construction — `UserAchievement`'s `@@unique([userId,
 * achievementId])` (INF-19) means a duplicate unlock attempt is rejected by
 * the database itself, so this never has to trust its own "already
 * unlocked" read against a race from two events landing at once.
 */
export async function evaluateAchievements(
  userId: string,
): Promise<AchievementUnlockResult> {
  const [achievements, unlockedRows, snapshot] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    }),
    buildSnapshot(userId),
  ]);

  if (!snapshot) return { unlocked: [], levelUp: null };

  const alreadyUnlocked = new Set(unlockedRows.map((row) => row.achievementId));

  const newlyMet = achievements.filter((achievement) => {
    if (alreadyUnlocked.has(achievement.id)) return false;
    const criterion = achievement.criteria as AchievementCriterion;
    return evaluateCriterion(criterion, snapshot).unlocked;
  });

  if (newlyMet.length === 0) return { unlocked: [], levelUp: null };

  await prisma.userAchievement.createMany({
    data: newlyMet.map((achievement) => ({
      userId,
      achievementId: achievement.id,
    })),
    skipDuplicates: true,
  });

  const totalXp = newlyMet.reduce((sum, achievement) => sum + achievement.xpReward, 0);
  const levelUp = await grantAchievementReward(userId, totalXp);

  return { unlocked: newlyMet, levelUp };
}

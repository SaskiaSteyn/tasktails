import type { Achievement } from "@/generated/prisma/client";
import { economyForUser } from "@/lib/economy";
import { purchaseCount } from "@/lib/checkout";
import { prisma } from "@/lib/prisma";
import { completedTaskCount } from "@/lib/tasks";

/**
 * Every read and write of the achievement catalogue and a user's unlocks
 * (INF-19, PRO-07/08/09). Nothing outside this module touches
 * `prisma.achievement`/`prisma.userAchievement`, same rule as `tasks.ts`,
 * `economy.ts` and the rest.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { Achievement };

/**
 * The shape `Achievement.criteria` is stored as (the schema's own doc
 * comment on the model). Not an enum in the database — JSON, because the
 * trigger set wasn't settled when INF-19 landed — but typed here so this
 * module and `prisma/seed.ts` don't each guess at the field names.
 */
export type AchievementCriterion =
  | { type: "TASKS_COMPLETED"; threshold: number }
  | { type: "LEVEL_REACHED"; threshold: number }
  | { type: "STREAK_DAYS"; threshold: number }
  | { type: "ITEMS_PURCHASED"; threshold: number };

/** PRO-07/08's read shape — the catalogue plus this user's unlock state. */
export type AchievementWithState = Achievement & { unlockedAt: Date | null };

/** Every achievement, earned or not, for PRO-07's grid / PRO-08's route. */
export async function achievementsForUser(
  userId: string,
): Promise<AchievementWithState[]> {
  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { id: "asc" } }),
    prisma.userAchievement.findMany({ where: { userId } }),
  ]);

  const unlockedAt = new Map(
    unlocked.map((row) => [row.achievementId, row.unlockedAt]),
  );

  return achievements.map((achievement) => ({
    ...achievement,
    unlockedAt: unlockedAt.get(achievement.id) ?? null,
  }));
}

/** The live figures every criterion type in {@link AchievementCriterion} grades against. */
async function progressFor(
  userId: string,
): Promise<Record<AchievementCriterion["type"], number>> {
  const [tasksCompleted, economy, itemsPurchased] = await Promise.all([
    completedTaskCount(userId),
    economyForUser(userId),
    purchaseCount(userId),
  ]);

  return {
    TASKS_COMPLETED: tasksCompleted,
    LEVEL_REACHED: economy?.level ?? 1,
    STREAK_DAYS: economy?.streak ?? 0,
    ITEMS_PURCHASED: itemsPurchased,
  };
}

/**
 * PRO-09 — evaluates the whole catalogue against a user's current progress
 * and unlocks whatever is newly met. Returns the achievements that were
 * newly unlocked by *this* call (empty most of the time).
 *
 * Called after task completion, purchase, and pet interaction — the three
 * trigger points the ticket names — regardless of which criterion types
 * that particular action could plausibly move. Re-checking the whole
 * catalogue on every one of them is deliberately not optimised: there are a
 * handful of achievements and this is a couple of cheap reads plus a
 * conditional write, not a hot path.
 *
 * Idempotent by construction — `UserAchievement`'s `@@unique([userId,
 * achievementId])` (INF-19) means a duplicate unlock attempt is rejected by
 * the database itself, so this never has to trust its own "already
 * unlocked" read against a race from two events landing at once.
 */
export async function evaluateAchievements(
  userId: string,
): Promise<Achievement[]> {
  const [achievements, unlockedRows, progress] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    }),
    progressFor(userId),
  ]);

  const alreadyUnlocked = new Set(unlockedRows.map((row) => row.achievementId));

  const newlyMet = achievements.filter((achievement) => {
    if (alreadyUnlocked.has(achievement.id)) return false;
    const criterion = achievement.criteria as AchievementCriterion;
    return progress[criterion.type] >= criterion.threshold;
  });

  if (newlyMet.length === 0) return [];

  await prisma.userAchievement.createMany({
    data: newlyMet.map((achievement) => ({
      userId,
      achievementId: achievement.id,
    })),
    skipDuplicates: true,
  });

  return newlyMet;
}

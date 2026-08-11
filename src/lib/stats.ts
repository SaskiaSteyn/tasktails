import { economyForUser } from "@/lib/economy";
import { petCount } from "@/lib/pets";
import { completedTaskCount } from "@/lib/tasks";

/**
 * PRO-04/05 — the Profile screen's "LIFETIME" 2×2 grid.
 *
 * Composes existing per-domain reads (`tasks.ts`, `economy.ts`, `pets.ts`)
 * rather than querying Prisma itself — each of those modules already owns
 * exclusive access to its table, and this has nothing new to add to any of
 * them.
 */
export type LifetimeStats = {
  tasksDone: number;
  /** Cumulative coins ever earned — see `UserEconomy.lifetimeCoinsEarned`. */
  coinsEarned: number;
  dayStreak: number;
  animalsOwned: number;
};

const EMPTY_STATS: LifetimeStats = {
  tasksDone: 0,
  coinsEarned: 0,
  dayStreak: 0,
  animalsOwned: 0,
};

/** All four figures for one user, or the zeroed shape for a gone account. */
export async function lifetimeStatsFor(userId: string): Promise<LifetimeStats> {
  const [tasksDone, economy, animalsOwned] = await Promise.all([
    completedTaskCount(userId),
    economyForUser(userId),
    petCount(userId),
  ]);

  if (!economy) return { ...EMPTY_STATS, tasksDone, animalsOwned };

  return {
    tasksDone,
    coinsEarned: Math.max(0, economy.lifetimeCoinsEarned),
    dayStreak: Math.max(0, economy.streak),
    animalsOwned,
  };
}

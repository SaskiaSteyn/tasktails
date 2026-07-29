import { auth } from "@/auth";
import type { UserEconomy } from "@/generated/prisma/client";
import { levelProgress, type LevelProgress } from "@/lib/levels";
import { prisma } from "@/lib/prisma";
import {
  antiSpamKeepFor,
  applyAntiSpam,
  FULL_REWARD_REPEATS_PER_DAY,
  type Reward,
} from "@/lib/rewards";
import { completionsOfTitleToday, lastCompletionOfTitle } from "@/lib/tasks";

/**
 * Every read of a participant's coins / XP / streak (INF-10, INF-12).
 *
 * Same rule as src/lib/users.ts: nothing outside this module touches
 * `prisma.userEconomy`, so the earning rules (ECO-01..ECO-05) land in one place
 * when they arrive.
 *
 * SERVER ONLY — imports `auth()` and Prisma.
 */

export type { UserEconomy };

/** What the persistent header draws. */
export type EconomySnapshot = LevelProgress & {
  coins: number;
  streak: number;
};

/**
 * The row for a user, or null if they have none.
 *
 * In practice every account gets one at creation (AUTH-04 creates it in the same
 * transaction), so a null here means the account is gone, not new.
 */
export async function economyForUser(
  userId: string,
): Promise<UserEconomy | null> {
  return prisma.userEconomy.findUnique({ where: { userId } });
}

/**
 * Turns a stored row into what the header renders.
 *
 * Level and XP progress are both derived from `xp` rather than read from the
 * `level` column. That column is ECO-05's denormalised copy — deriving here
 * means the level disc and the XP bar beside it are computed from one number and
 * can never disagree with each other, which is the failure a participant would
 * actually notice. If the two ever diverge, `xp` is the truth.
 */
export function snapshotOf(
  economy: Pick<UserEconomy, "coins" | "xp" | "streak">,
): EconomySnapshot {
  return {
    ...levelProgress(economy.xp),
    coins: Math.max(0, economy.coins),
    streak: Math.max(0, economy.streak),
  };
}

/** A signed-out or missing user reads as a fresh account rather than a crash. */
export const EMPTY_ECONOMY: EconomySnapshot = snapshotOf({
  coins: 0,
  xp: 0,
  streak: 0,
});

/**
 * The signed-in participant's economy, ready to render.
 *
 * Returns null when nobody is signed in — the header is only ever drawn on
 * authenticated screens, so a null is the caller's cue that it should not be
 * drawing one at all.
 */
export async function currentEconomy(): Promise<EconomySnapshot | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const economy = await economyForUser(userId);
  return economy ? snapshotOf(economy) : EMPTY_ECONOMY;
}

/** Why the guardrail landed where it did — for the completion toast and telemetry. */
export type AntiSpamReason =
  /** No completion of this title inside the 72 h window. */
  | "first-completion"
  /** A duplicate that already existed before the last completion of its title. */
  | "planned-ahead"
  /** Created after the last completion of its title — the farming pattern. */
  | "repeat"
  /** Planned ahead, but today's full-reward allowance for this title is spent. */
  | "daily-allowance-spent";

/** What the anti-spam guardrail decided about one completion (ECO-02). */
export type AntiSpamCheck = {
  /** The previous completion of this title inside the window, or null. */
  lastCompletedAt: Date | null;
  /** Fraction of the reward that survives: 1, 0.5, 0.25 or 0.1. */
  keep: number;
  /** True when anything was taken off. */
  reduced: boolean;
  reason: AntiSpamReason;
  /** Same-titled completions already banked today, excluding this one. */
  completionsToday: number;
};

/** The task being priced, as the guardrail needs to see it. */
export type CompletingTask = {
  /** Excluded from its own history. */
  id?: string;
  title: string;
  /**
   * Task.createdAt — what separates planning from farming. Absent is treated as
   * a repeat rather than as planned-ahead: an unknown origin should not be the
   * cheapest way past the guardrail.
   */
  createdAt?: Date | null;
};

/**
 * NFR-TASK-1 — grades a completion against the same title's recent history.
 *
 * Title-based rather than task-based: deleting and re-creating "Reply to email"
 * every hour is the farming route the guardrail exists to close, and a check
 * keyed on task id would miss it entirely. Matching is on `Task.titleKey`, so
 * whitespace and capitalisation cannot be used to slip past it.
 *
 * Two exemptions sit on top of the raw rule, because matching on title alone
 * also catches honest behaviour — someone who plans a week of "Gym" tasks in
 * one sitting:
 *
 *  1. A duplicate that *already existed* when its title was last completed was
 *     planned, not spawned in response to a reward, and keeps its full value.
 *  2. That exemption runs out after `FULL_REWARD_REPEATS_PER_DAY` completions of
 *     the same title in a day, so one large batch cannot buy unlimited rewards.
 *
 * Both are deviations from Requirements §NFR-TASK-1 as literally written, and
 * are recorded there.
 */
export async function antiSpamCheck(
  userId: string,
  task: CompletingTask,
  completedAt: Date,
): Promise<AntiSpamCheck> {
  const lookup = { completedAt, excludeTaskId: task.id };

  const [lastCompletedAt, completionsToday] = await Promise.all([
    lastCompletionOfTitle(userId, task.title, lookup),
    completionsOfTitleToday(userId, task.title, lookup),
  ]);

  const full = (reason: AntiSpamReason): AntiSpamCheck => ({
    lastCompletedAt,
    keep: 1,
    reduced: false,
    reason,
    completionsToday,
  });

  if (!lastCompletedAt) return full("first-completion");

  const allowanceSpent = completionsToday >= FULL_REWARD_REPEATS_PER_DAY;
  const plannedAhead =
    !!task.createdAt && task.createdAt.getTime() <= lastCompletedAt.getTime();

  if (plannedAhead && !allowanceSpent) return full("planned-ahead");

  return {
    lastCompletedAt,
    keep: antiSpamKeepFor(lastCompletedAt, completedAt),
    reduced: true,
    reason: allowanceSpent ? "daily-allowance-spent" : "repeat",
    completionsToday,
  };
}

/**
 * The guardrail applied end to end, for callers that already hold a priced
 * reward and only need it graded — the reduction itself is ECO-01's
 * `applyAntiSpam`, floor and all.
 */
export async function reduceForRepeats(
  reward: Reward,
  userId: string,
  task: CompletingTask,
  completedAt: Date,
): Promise<{ reward: Reward; check: AntiSpamCheck }> {
  const check = await antiSpamCheck(userId, task, completedAt);
  return { reward: applyAntiSpam(reward, check.keep), check };
}

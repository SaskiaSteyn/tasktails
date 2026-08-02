import { auth } from "@/auth";
import type { UserEconomy } from "@/generated/prisma/client";
import {
  calendarDaysBetween,
  isSameDay,
  startOfDay,
  startOfNextDay,
} from "@/lib/day";
import {
  levelForXp,
  levelProgress,
  MAX_LEVEL,
  type LevelProgress,
} from "@/lib/levels";
import { prisma } from "@/lib/prisma";
import {
  antiSpamKeepFor,
  applyAntiSpam,
  applyDailyCap,
  BUY_XP_COST_COINS,
  BUY_XP_GAIN_XP,
  DAILY_COIN_CAP,
  DAILY_XP_CAP,
  FULL_REWARD_REPEATS_PER_DAY,
  streakBonusFor,
  type CappedReward,
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

/** A threshold crossing, for the toast ECO-07 raises. */
export type LevelUpEvent = {
  /** Level before the XP landed. */
  from: number;
  /** Level after it. Always greater than `from`. */
  to: number;
  /**
   * Every level reached, in order — `[2, 3, 4, 5]` when one completion crosses
   * four thresholds at once, which the hockey-stick curve makes routine in a
   * participant's first session (§3.6). A toast that only knew `to` would
   * silently swallow the three levels in between.
   */
  levelsGained: number[];
  /** Cumulative XP after the grant. */
  xp: number;
  /** True when `to` is the top of the curve and there is nothing left to reach. */
  isMaxLevel: boolean;
};

/**
 * The threshold crossing between two XP totals, or null if none (ECO-05).
 *
 * Pure — the table is INF-21's `levelForXp`, consulted here rather than copied.
 * Both places that add XP (task completion and ECO-06's coin conversion) run
 * through this, so there is one definition of "levelled up".
 */
export function levelUpBetween(
  xpBefore: number,
  xpAfter: number,
): LevelUpEvent | null {
  const from = levelForXp(Math.max(0, xpBefore));
  const to = levelForXp(Math.max(0, xpAfter));
  if (to <= from) return null;

  return {
    from,
    to,
    levelsGained: Array.from({ length: to - from }, (_, i) => from + 1 + i),
    xp: Math.max(0, xpAfter),
    isMaxLevel: to >= MAX_LEVEL,
  };
}

/**
 * The one way `xp` is ever written (ECO-05).
 *
 * Returns the `xp`/`level` half of an update together with the event that
 * change represents, so a caller physically cannot move XP without moving the
 * level with it. `grantEarnings` and ECO-06's coin conversion both go through
 * here.
 *
 * This exists because a stale `level` column is *silent*: the header derives
 * its level from `xp` and would look perfectly correct, while the store's
 * level gate quietly withheld items the participant had earned. A bug with no
 * visible symptom in a study instrument is worth a little structure to prevent.
 *
 * `xpBefore` must have been read under the transaction's row lock — the
 * increment is relative, but the level is absolute, so an unlocked read would
 * compute the new level from a total that has already moved.
 */
export function xpWrite(
  xpBefore: number,
  deltaXp: number,
): {
  data: { xp: { increment: number }; level: number };
  xpAfter: number;
  levelUp: LevelUpEvent | null;
} {
  const xpAfter = Math.max(0, xpBefore + deltaXp);

  return {
    data: { xp: { increment: deltaXp }, level: levelForXp(xpAfter) },
    xpAfter,
    levelUp: levelUpBetween(xpBefore, xpAfter),
  };
}

/**
 * Re-derives the stored `level` column from `xp`.
 *
 * The column is a denormalised copy: `snapshotOf` deliberately ignores it and
 * computes the level from `xp` so the header's level disc and XP bar can never
 * disagree. What the column is actually for is SQL-side filtering — the store's
 * level gates (§3.7) want `WHERE "levelRequired" <= "level"` rather than every
 * item pulled into the app to be filtered in memory.
 *
 * Because nothing *reads* it for display, a stale value is silent, so this
 * exists to repair one. Normal writes keep it in step themselves.
 *
 * Returns null when the account has no economy row.
 */
export async function syncLevel(
  userId: string,
): Promise<{ level: number; corrected: boolean } | null> {
  const economy = await prisma.userEconomy.findUnique({
    where: { userId },
    select: { xp: true, level: true },
  });
  if (!economy) return null;

  const level = levelForXp(economy.xp);
  if (level === economy.level) return { level, corrected: false };

  await prisma.userEconomy.update({ where: { userId }, data: { level } });
  return { level, corrected: true };
}

/** What NFR-TASK-2 allows in a day. */
export const DAILY_CAPS: Reward = { coins: DAILY_COIN_CAP, xp: DAILY_XP_CAP };

/** How much of today's cap is left (ECO-03). */
export type DailyAllowance = {
  /** Banked today. Zero once the stored counters are a day stale. */
  earned: Reward;
  /** Cap minus earned, floored at 0 — what a grant can still bank. */
  remaining: Reward;
  coinCapReached: boolean;
  xpCapReached: boolean;
  /** Local midnight when these counters next reset. */
  resetsAt: Date;
};

/** The three columns ECO-03 reads and writes. */
type DailyCounters = Pick<
  UserEconomy,
  "dailyCoinsEarned" | "dailyXpEarned" | "dailyCapResetAt"
>;

/**
 * Reads the stored counters as of `now` (ECO-03).
 *
 * The reset is **lazy**: nothing sweeps the table at midnight, so counters from
 * a previous day are simply read as zero and overwritten by the next grant.
 * `dailyCapResetAt` is the day the stored numbers describe, not the moment a
 * reset is due — an account that goes quiet for a week still reads as a clean
 * slate on its return, with no scheduled job to keep alive on a $0 budget
 * (NFR-GEN-3).
 *
 * Pure, so the dashboard can render remaining allowance from a row it already
 * holds without a second query.
 */
export function dailyAllowanceOf(
  counters: DailyCounters,
  now: Date = new Date(),
): DailyAllowance {
  const stale = !isSameDay(counters.dailyCapResetAt, now);

  const earned: Reward = stale
    ? { coins: 0, xp: 0 }
    : {
        coins: Math.max(0, counters.dailyCoinsEarned),
        xp: Math.max(0, counters.dailyXpEarned),
      };

  const remaining: Reward = {
    coins: Math.max(0, DAILY_COIN_CAP - earned.coins),
    xp: Math.max(0, DAILY_XP_CAP - earned.xp),
  };

  return {
    earned,
    remaining,
    coinCapReached: remaining.coins === 0,
    xpCapReached: remaining.xp === 0,
    resetsAt: startOfNextDay(now),
  };
}

/** Today's allowance for a user, or null if the account has no economy row. */
export async function dailyAllowanceFor(
  userId: string,
  now: Date = new Date(),
): Promise<DailyAllowance | null> {
  const economy = await prisma.userEconomy.findUnique({
    where: { userId },
    select: {
      dailyCoinsEarned: true,
      dailyXpEarned: true,
      dailyCapResetAt: true,
    },
  });

  return economy ? dailyAllowanceOf(economy, now) : null;
}

/** The outcome of banking a reward. */
export type EarningsGrant = CappedReward & {
  /** What is left of the cap *after* this grant. */
  allowance: DailyAllowance;
  /** Set when the granted XP crossed a threshold (ECO-05). Null otherwise. */
  levelUp: LevelUpEvent | null;
  /** The row as it now stands. */
  economy: UserEconomy;
};

/**
 * Banks a reward against the daily cap (NFR-TASK-2), returning what actually
 * landed.
 *
 * A partial grant rather than an outright rejection, as ECO-01's `applyDailyCap`
 * defines it: someone 290 coins into their 300 still banks the last 10, and the
 * withheld remainder comes back so the completion toast can say why the number
 * was smaller than the task promised.
 *
 * The read is `SELECT … FOR UPDATE` inside a transaction rather than a plain
 * find. Two completions submitted at once would otherwise both read the same
 * "earned today" figure and both bank in full, putting a participant over the
 * cap — and the cap is a study control, not a nicety, so it cannot depend on
 * participants not double-tapping. The row lock makes the second grant wait and
 * see the first one's effect.
 *
 * Returns null when the account has no economy row, which in practice means the
 * account is gone (AUTH-04 creates the row with the user).
 */
export async function grantEarnings(
  userId: string,
  reward: Reward,
  now: Date = new Date(),
): Promise<EarningsGrant | null> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<(DailyCounters & { xp: number })[]>`
      SELECT "xp", "dailyCoinsEarned", "dailyXpEarned", "dailyCapResetAt"
      FROM "UserEconomy"
      WHERE "userId" = ${userId}
      FOR UPDATE`;

    const counters = locked[0];
    if (!counters) return null;

    const stale = !isSameDay(counters.dailyCapResetAt, now);
    const before = dailyAllowanceOf(counters, now);
    const capped = applyDailyCap(reward, before.earned);

    // ECO-05 inside the same statement rather than a second write: the level
    // column is derived from the XP being written in this very update, so a
    // separate follow-up write would leave a window where the two disagree —
    // and would need its own lock to be safe.
    const xp = xpWrite(counters.xp, capped.granted.xp);

    // A stale row is rewritten rather than incremented — the stored numbers
    // belong to a day that has ended, so adding to them would carry yesterday's
    // earnings into today's cap.
    const economy = await tx.userEconomy.update({
      where: { userId },
      data: {
        ...xp.data,
        coins: { increment: capped.granted.coins },
        // Grows even when a partial (daily-cap-trimmed) grant lands — this
        // tracks what was actually banked, same as `coins` itself, not the
        // reward's pre-cap face value.
        lifetimeCoinsEarned: { increment: capped.granted.coins },
        dailyCoinsEarned: stale
          ? capped.granted.coins
          : { increment: capped.granted.coins },
        dailyXpEarned: stale
          ? capped.granted.xp
          : { increment: capped.granted.xp },
        ...(stale ? { dailyCapResetAt: startOfDay(now) } : {}),
      },
    });

    return {
      ...capped,
      allowance: dailyAllowanceOf(economy, now),
      levelUp: xp.levelUp,
      economy,
    };
  });
}

/** What happened to a streak when a completion landed (ECO-04). */
export type StreakEvent =
  /** First streak day this account has ever had. */
  | "started"
  /** Yesterday was a streak day too — the counter went up. */
  | "extended"
  /** A day was missed; the counter is back to 1. */
  | "broken"
  /** Not the first completion today, so the counter had already moved. */
  | "already-counted";

export type StreakUpdate = {
  /** The counter after this completion. */
  streak: number;
  previousStreak: number;
  event: StreakEvent;
  /** True when this completion is what made today a streak day. */
  isFirstToday: boolean;
  /** The coin bonus now in force: 0, 0.1, 0.2 or 0.35. */
  bonus: number;
};

/** The two columns the streak lives in. */
type StreakColumns = Pick<UserEconomy, "streak" | "lastStreakDate">;

/**
 * Where a streak lands when a task is completed at `now` (§3.4).
 *
 * A streak day is "at least 1 task completed that day", so the *first*
 * completion of a day moves the counter and every completion after it is a
 * no-op. That makes this safe to call on every completion — which is what
 * makes it correct, since the alternative is each caller remembering whether it
 * has already recorded today.
 *
 * Pure, so the dashboard can show what a completion would do to a streak
 * without writing anything.
 */
export function nextStreak(
  columns: StreakColumns,
  now: Date = new Date(),
): StreakUpdate {
  const previousStreak = Math.max(0, columns.streak);
  const settle = (streak: number, event: StreakEvent, isFirstToday: boolean) => ({
    streak,
    previousStreak,
    event,
    isFirstToday,
    bonus: streakBonusFor(streak),
  });

  if (!columns.lastStreakDate) return settle(1, "started", true);

  const daysSince = calendarDaysBetween(columns.lastStreakDate, now);

  // Today (0), or a stored date in the future (negative) — clock skew or a
  // backdated completion. Either way the day is already counted; re-counting it
  // would let one active day inflate a streak.
  if (daysSince <= 0) {
    return settle(Math.max(previousStreak, 1), "already-counted", false);
  }

  // Yesterday. `max(…, 1)` guards a row that somehow has a date but a 0 counter,
  // so an inconsistent row heals upward rather than sticking at 1 forever.
  if (daysSince === 1) {
    return settle(Math.max(previousStreak, 1) + 1, "extended", true);
  }

  return settle(1, "broken", true);
}

/**
 * Records today as a streak day and returns what that did to the counter.
 *
 * Locked with `SELECT … FOR UPDATE` for the same reason as `grantEarnings`: two
 * completions landing together would both read yesterday's date and both
 * increment, handing out a streak day that was never earned. The lock makes the
 * second one see the first's write and fall through to "already-counted".
 *
 * Call this *before* pricing the completion — the first task of day 3 should
 * itself earn the 10% bonus, so `calculateReward` needs the post-update streak.
 *
 * Returns null when the account has no economy row.
 */
export async function recordStreakDay(
  userId: string,
  now: Date = new Date(),
): Promise<StreakUpdate | null> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<StreakColumns[]>`
      SELECT "streak", "lastStreakDate"
      FROM "UserEconomy"
      WHERE "userId" = ${userId}
      FOR UPDATE`;

    const columns = locked[0];
    if (!columns) return null;

    const update = nextStreak(columns, now);
    if (!update.isFirstToday) return update;

    await tx.userEconomy.update({
      where: { userId },
      // Stored as local midnight, not the completion time: the column answers
      // "which day was the last streak day", and a time-of-day component would
      // invite an elapsed-hours comparison somewhere down the line.
      data: { streak: update.streak, lastStreakDate: startOfDay(now) },
    });

    return update;
  });
}

/** The outcome of a coin → XP conversion (ECO-06). */
export type BuyXpResult =
  | {
      ok: true;
      /** Coins taken. */
      spent: number;
      /** XP added. */
      gained: number;
      levelUp: LevelUpEvent | null;
      economy: UserEconomy;
    }
  | {
      ok: false;
      reason: "insufficient-coins";
      /** What they hold now. */
      coins: number;
      /** How many more they need. */
      shortfall: number;
    }
  | { ok: false; reason: "no-account" };

/**
 * Buys XP with coins — 100 → 40 (§3.1).
 *
 * The daily XP cap is deliberately **not** applied here. NFR-TASK-2 caps what a
 * participant can *earn* "across all tasks", and these coins were already
 * earned under that cap on the day they were banked; charging the ceiling twice
 * for the same effort would make a conversion after a busy day silently do
 * nothing. What limits this is the coin price — 300 coins a day buys at most
 * 120 XP, and every coin spent here is a coin not spent in the store, which is
 * the trade-off the study is actually interested in.
 *
 * Locked and level-updated exactly like `grantEarnings`: the balance check and
 * the deduction have to see the same row, or two conversions submitted together
 * could both pass a check that only one of them could afford.
 */
export async function buyXp(
  userId: string,
  cost: number = BUY_XP_COST_COINS,
  gain: number = BUY_XP_GAIN_XP,
): Promise<BuyXpResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ coins: number; xp: number }[]>`
      SELECT "coins", "xp"
      FROM "UserEconomy"
      WHERE "userId" = ${userId}
      FOR UPDATE`;

    const current = locked[0];
    if (!current) return { ok: false, reason: "no-account" } as const;

    if (current.coins < cost) {
      return {
        ok: false,
        reason: "insufficient-coins",
        coins: current.coins,
        shortfall: cost - current.coins,
      } as const;
    }

    const xp = xpWrite(current.xp, gain);
    const economy = await tx.userEconomy.update({
      where: { userId },
      data: { ...xp.data, coins: { decrement: cost } },
    });

    return {
      ok: true,
      spent: cost,
      gained: gain,
      levelUp: xp.levelUp,
      economy,
    } as const;
  });
}

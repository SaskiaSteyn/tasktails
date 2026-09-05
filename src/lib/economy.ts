import { auth } from "@/auth";
import type { Prisma, UserEconomy } from "@/generated/prisma/client";
import { calendarDaysBetween, startOfDay } from "@/lib/day";
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
  BUY_XP_COST_COINS,
  BUY_XP_GAIN_XP,
  cooldownMinutesFor,
  EARNING_WINDOW_TASKS,
  FULL_REWARD_REPEATS_PER_DAY,
  streakBonusFor,
  type Reward,
} from "@/lib/rewards";
import { completionsOfTitleToday, lastCompletionOfTitle } from "@/lib/tasks";
import { logTelemetryEvent } from "@/lib/telemetry";

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

/**
 * #224 — the earning window / cooldown state the header pill and the task
 * screen's banner render. Derived from the row, not stored in this shape.
 */
export type EarningStatus = {
  /** Rewarded whole-task completions used in the current window (0…`windowSize`). */
  windowUsed: number;
  windowSize: number;
  /** ISO timestamp earning resumes, or `null` when earning is open. */
  cooldownUntil: string | null;
};

/** The `UserEconomy` columns `earningStatusOf` needs. */
type EarningColumns = Pick<
  UserEconomy,
  "earningWindowTiers" | "earningCooldownUntil"
>;

/** Reads `EarningStatus` off a row, resolving an expired cooldown to "open". */
export function earningStatusOf(
  row: EarningColumns,
  now: Date = new Date(),
): EarningStatus {
  const until = row.earningCooldownUntil;
  const onCooldown = until !== null && until.getTime() > now.getTime();
  return {
    windowUsed: onCooldown ? EARNING_WINDOW_TASKS : row.earningWindowTiers.length,
    windowSize: EARNING_WINDOW_TASKS,
    cooldownUntil: onCooldown ? until.toISOString() : null,
  };
}

/** What the persistent header draws. */
export type EconomySnapshot = LevelProgress & {
  coins: number;
  streak: number;
  /** #224 — window progress + cooldown, for the header's earning pill. */
  earning: EarningStatus;
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
 * LEAD-03 — lifetime coins earned for a set of accounts, keyed by user id.
 *
 * Lives here rather than in `leaderboard.ts` for the reason at the top of this
 * file: `prisma.userEconomy` has one owner. `leaderboard.ts` composes this the
 * way `stats.ts` composes `economyForUser`.
 *
 * Accounts with no economy row are simply absent from the map — callers decide
 * whether that means zero or means skip. Clamped at zero on the way out, same
 * as `snapshotOf` and `lifetimeStatsFor` do, so a negative can never reach a
 * ranking.
 */
export async function lifetimeEarningsFor(
  userIds: string[],
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.userEconomy.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, lifetimeCoinsEarned: true },
  });

  return new Map(
    rows.map((row) => [row.userId, Math.max(0, row.lifetimeCoinsEarned)]),
  );
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
  economy: Pick<
    UserEconomy,
    "coins" | "xp" | "streak" | "earningWindowTiers" | "earningCooldownUntil"
  >,
): EconomySnapshot {
  return {
    ...levelProgress(economy.xp),
    coins: Math.max(0, economy.coins),
    streak: Math.max(0, economy.streak),
    earning: earningStatusOf(economy),
  };
}

/** A signed-out or missing user reads as a fresh account rather than a crash. */
export const EMPTY_ECONOMY: EconomySnapshot = snapshotOf({
  coins: 0,
  xp: 0,
  streak: 0,
  earningWindowTiers: [],
  earningCooldownUntil: null,
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

/** A running cooldown, as `grantEarnings` reports it back. */
export type EarningCooldown = {
  /** Absolute moment earning resumes. */
  until: Date;
  /** ms from `now` to `until` — the client's first countdown value. */
  remainingMs: number;
};

/** The outcome of banking a reward through the #224 cooldown gate. */
export type EarningsGrant = {
  /** What was actually banked. `{0,0}` when a cooldown was active. */
  granted: Reward;
  /** What the cooldown withheld — `{0,0}` when earning was open. */
  withheld: Reward;
  /** True when this completion earned nothing because a cooldown is running. */
  onCooldown: boolean;
  /** Non-null while a cooldown is in force — set the moment the window fills, and returned by every completion until it lifts. */
  cooldown: EarningCooldown | null;
  /** True only on the completion that *started* the cooldown (the 3rd in the window). */
  cooldownStarted: boolean;
  /** Whole-task completions still earning before the next cooldown (0…`EARNING_WINDOW_TASKS`). */
  windowRemaining: number;
  /** Set when the granted XP crossed a threshold (ECO-05). Null otherwise. */
  levelUp: LevelUpEvent | null;
  /** The row as it now stands. */
  economy: UserEconomy;
};

/** The completion this grant is for — `grantEarnings` needs it for the window and the telemetry. */
export type EarningContext = {
  taskId: string;
  /** The completing task's `complexityTier`. */
  tier: number;
  /** `true` for a whole-task completion (advances the window), `false` for a subtask. */
  advancesWindow: boolean;
};

/** `[1,5,3]` → `"1-3-5"` — the order-independent difficulty *mix* the admin table groups on (#224 §6). */
function mixKeyOf(tiers: number[]): string {
  return [...tiers].sort((a, b) => a - b).join("-");
}

/**
 * Banks a reward through the #224 earning cooldown (replacing `NFR-TASK-2`).
 *
 * If a cooldown is running, the completion earns **nothing** — coins and XP
 * both withheld — but still returns a result so the caller can mark the task
 * done and record the streak. Otherwise the full priced reward is banked
 * (there is no cap), and a whole-task completion appends its tier to
 * `earningWindowTiers`; the 3rd one starts a cooldown whose length is
 * `cooldownMinutesFor()` of those three tiers.
 *
 * The read is `SELECT … FOR UPDATE` inside a transaction, same as before: two
 * completions submitted together must not both slip past a full window, and
 * the cooldown is a study control. An expired `earningCooldownUntil` is
 * cleared lazily by the next completion (no midnight job — the window and
 * cooldown are duration-based, never calendar-based).
 *
 * Logs the three #224 telemetry events (`design_handoff/
 * ADDENDUM-earning-cooldown.md` §6) on the same `tx`, so they commit with the
 * economy write they describe.
 *
 * Returns null when the account has no economy row (AUTH-04 creates one with
 * the user, so in practice the account is gone).
 */
export async function grantEarnings(
  userId: string,
  reward: Reward,
  ctx: EarningContext,
  now: Date = new Date(),
): Promise<EarningsGrant | null> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { xp: number; earningWindowTiers: number[]; earningCooldownUntil: Date | null }[]
    >`
      SELECT "xp", "earningWindowTiers", "earningCooldownUntil"
      FROM "UserEconomy"
      WHERE "userId" = ${userId}
      FOR UPDATE`;

    const row = locked[0];
    if (!row) return null;

    const cooldownUntil = row.earningCooldownUntil;
    const onCooldown =
      cooldownUntil !== null && cooldownUntil.getTime() > now.getTime();

    // --- Cooldown active: withhold everything, touch no economy fields.
    if (onCooldown) {
      await logTelemetryEvent(
        userId,
        "TASK_COMPLETED_ON_COOLDOWN",
        {
          taskId: ctx.taskId,
          tier: ctx.tier,
          cooldownRemainingMs: cooldownUntil.getTime() - now.getTime(),
        },
        tx,
      );

      const economy = await tx.userEconomy.findUniqueOrThrow({ where: { userId } });
      return {
        granted: { coins: 0, xp: 0 },
        withheld: { ...reward },
        onCooldown: true,
        cooldown: {
          until: cooldownUntil,
          remainingMs: cooldownUntil.getTime() - now.getTime(),
        },
        cooldownStarted: false,
        windowRemaining: 0,
        levelUp: null,
        economy,
      };
    }

    // --- Earning open. An expired cooldown means the window resets now, and
    //     this is the "resumed" completion (#224 §6's `EARNING_RESUMED`).
    const justExpired = cooldownUntil !== null;
    if (justExpired) {
      const previousTiers = row.earningWindowTiers;
      await logTelemetryEvent(
        userId,
        "EARNING_RESUMED",
        {
          mixKey: mixKeyOf(previousTiers),
          windowTiers: previousTiers,
          cooldownMinutes: cooldownMinutesFor(previousTiers),
          cooldownEndedAt: cooldownUntil.toISOString(),
          waitAfterCooldownMs: now.getTime() - cooldownUntil.getTime(),
          nextTaskTier: ctx.tier,
        },
        tx,
      );
    }

    const tiersBefore = justExpired ? [] : row.earningWindowTiers;
    const newTiers = ctx.advancesWindow ? [...tiersBefore, ctx.tier] : tiersBefore;
    const triggersCooldown =
      ctx.advancesWindow && newTiers.length >= EARNING_WINDOW_TASKS;

    const minutes = triggersCooldown ? cooldownMinutesFor(newTiers) : 0;
    const newCooldownUntil = triggersCooldown
      ? new Date(now.getTime() + minutes * 60_000)
      : null;

    // ECO-05 in the same statement — the level column is derived from the XP
    // written here, so a separate follow-up write would leave a window where
    // the two disagree.
    const xp = xpWrite(row.xp, reward.xp);

    const economy = await tx.userEconomy.update({
      where: { userId },
      data: {
        ...xp.data,
        coins: { increment: reward.coins },
        lifetimeCoinsEarned: { increment: reward.coins },
        // Reset on cooldown start; otherwise carry the (possibly just-cleared)
        // window forward with this completion's tier appended.
        earningWindowTiers: triggersCooldown ? [] : newTiers,
        earningCooldownUntil: triggersCooldown
          ? newCooldownUntil
          : justExpired
            ? null
            : row.earningCooldownUntil,
      },
    });

    if (triggersCooldown && newCooldownUntil) {
      await logTelemetryEvent(
        userId,
        "EARNING_COOLDOWN_STARTED",
        {
          mixKey: mixKeyOf(newTiers),
          windowTiers: newTiers,
          tierSum: newTiers.reduce((sum, t) => sum + t, 0),
          cooldownMinutes: minutes,
          cooldownUntil: newCooldownUntil.toISOString(),
        },
        tx,
      );
    }

    return {
      granted: { ...reward },
      withheld: { coins: 0, xp: 0 },
      onCooldown: false,
      cooldown: newCooldownUntil
        ? { until: newCooldownUntil, remainingMs: minutes * 60_000 }
        : null,
      cooldownStarted: triggersCooldown,
      windowRemaining: triggersCooldown
        ? 0
        : Math.max(0, EARNING_WINDOW_TASKS - newTiers.length),
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
 * The #224 earning cooldown is deliberately **not** applied here. The cooldown
 * paces what a participant can *earn from tasks*; these coins were already
 * earned (under the cooldown) before they could be spent, and gating the
 * conversion too would just be charging for the same effort twice. What limits
 * this is the coin price, and every coin spent here is a coin not spent in the
 * store — the trade-off the study is actually interested in.
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

/**
 * PRO-18 — pays out an achievement's seeded XP reward. Same lock-then-
 * `xpWrite()` shape as `buyXp()`, and for the same reason it is not subject to
 * the #224 earning cooldown: a one-time milestone bonus (up to 1000 XP for the
 * "unlock everything" badge alone) shouldn't be withheld by a mechanic that
 * exists to pace task-grinding, not one-off achievements.
 *
 * No coins — `Achievements.pdf` only seeds an XP figure per badge. Returns
 * null both when there's nothing to grant (`xp <= 0`) and when the account
 * has no economy row, the same "can't tell the difference" shape most of
 * this module's lookups use.
 */
export async function grantAchievementReward(
  userId: string,
  xp: number,
): Promise<LevelUpEvent | null> {
  if (xp <= 0) return null;

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ xp: number }[]>`
      SELECT "xp"
      FROM "UserEconomy"
      WHERE "userId" = ${userId}
      FOR UPDATE`;

    const current = locked[0];
    if (!current) return null;

    const write = xpWrite(current.xp, xp);
    await tx.userEconomy.update({ where: { userId }, data: write.data });
    return write.levelUp;
  });
}

/**
 * Combines two level-up events from the same request into one celebration
 * instead of two back-to-back dialogs — e.g. a task's own XP grant crossing
 * a threshold *and* an achievement it triggered crossing another. `a` is
 * assumed to have happened first, so `b.to`/`b.xp`/`b.isMaxLevel` are the
 * final, authoritative state; `levelsGained` is the full climb across both.
 */
export function mergeLevelUps(
  a: LevelUpEvent | null,
  b: LevelUpEvent | null,
): LevelUpEvent | null {
  if (!a) return b;
  if (!b) return a;

  return {
    from: a.from,
    to: b.to,
    levelsGained: [...a.levelsGained, ...b.levelsGained],
    xp: b.xp,
    isMaxLevel: b.isMaxLevel,
  };
}

/**
 * PRO-18 — bumps the lifetime "pet"/"feed" interaction counters the Petting
 * Zoo achievements ("pet/feed animals 50 times") read. Live here, not in
 * `pets.ts`, because this module is the sole owner of `prisma.userEconomy`
 * (same rule `pets.ts`'s own header comment states for `prisma.pet`) —
 * `pets.ts` calls these from inside its own transaction, the same
 * "caller owns the transaction, this function just participates" shape
 * `consumeFoodItem()`/`equipAccessory()` (`src/lib/inventory.ts`) already
 * use for the same cross-module-write situation.
 *
 * `updateMany`, not `update` — an account with no economy row (shouldn't
 * happen; AUTH-04 creates one with the user) matches zero rows rather than
 * throwing and aborting the pet interaction it's riding along with, which
 * has no "already done" state of its own to fail forward-only into.
 */
export async function incrementPetInteractionCount(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.userEconomy.updateMany({
    where: { userId },
    data: { lifetimePetInteractions: { increment: 1 } },
  });
}

export async function incrementFeedInteractionCount(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.userEconomy.updateMany({
    where: { userId },
    data: { lifetimeFeedInteractions: { increment: 1 } },
  });
}

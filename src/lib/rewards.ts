/**
 * The reward pipeline (ECO-01).
 *
 * One completed task becomes one coin/XP grant by running four stages in the
 * order Requirements §3.3–3.4 and NFR-TASK-1 describe:
 *
 *   base tier → efficiency → streak bonus → anti-spam
 *
 * The order is not cosmetic. Streak is a percentage bonus on *coins earned that
 * day*, so it has to see the efficiency-adjusted figure, not the base one. The
 * anti-spam reduction is a punishment for farming and must come after every
 * bonus, or a 14-day streak would hand back most of what the reduction took.
 *
 * There used to be a fifth stage, `NFR-TASK-2`'s 300/500 daily cap. #224
 * retired it in favour of the earning cooldown (`cooldownMinutesFor()` here,
 * `grantEarnings()` in `economy.ts`, `design_handoff/ADDENDUM-earning-cooldown.md`)
 * — the cooldown is a gate on *banking*, applied against locked DB state, not a
 * pricing stage, so it lives outside this pure module.
 *
 * Everything here is pure arithmetic — no Prisma, no clock. The one fact that
 * needs a database (how far the anti-spam guardrail reduced this completion)
 * arrives as an input, decided by ECO-02. That keeps the rules testable against
 * fixed numbers and keeps the study's economy auditable from one file.
 */

import { calendarDaysBetween } from "@/lib/day";

/** Coins and XP, always whole numbers, never negative. */
export type Reward = {
  coins: number;
  xp: number;
};

/** A self-reported complexity tier (Requirements §3.2). */
export type ComplexityTier = 1 | 2 | 3 | 4 | 5;

/**
 * The tier table. Task.complexityTier stores the key.
 *
 * XP outweighs coins at every tier on purpose: XP drives levels, which gate the
 * store, so the gates move on effort rather than on how much someone has saved.
 */
export const COMPLEXITY_TIERS: Record<
  ComplexityTier,
  { label: string; coins: number; xp: number }
> = {
  1: { label: "Trivial", coins: 5, xp: 8 },
  2: { label: "Small", coins: 15, xp: 20 },
  3: { label: "Medium", coins: 35, xp: 45 },
  4: { label: "Large", coins: 75, xp: 100 },
  5: { label: "Epic", coins: 150, xp: 200 },
};

/** +25% coins for beating the due date. XP is unaffected — effort is effort. */
export const EARLY_COIN_BONUS = 0.25;

/** Flat coin penalty per calendar day late, floored at 0 coins. */
export const LATE_COIN_PENALTY_PER_DAY = 10;

/** Consecutive-day thresholds and the coin bonus each unlocks (§3.4). */
export const STREAK_BONUSES = [
  { days: 14, bonus: 0.35 },
  { days: 7, bonus: 0.2 },
  { days: 3, bonus: 0.1 },
] as const;

/**
 * Repeat-completion windows and what fraction of the reward survives
 * (NFR-TASK-1). Ordered tightest-first; the first window the gap falls inside
 * wins.
 */
export const ANTI_SPAM_WINDOWS = [
  { withinHours: 24, keep: 0.5 },
  { withinHours: 48, keep: 0.25 },
  { withinHours: 72, keep: 0.1 },
] as const;

/** A reduced reward never drops below this — a repeat still pays something. */
export const ANTI_SPAM_FLOOR: Reward = { coins: 1, xp: 1 };

/**
 * How far back a repeat still counts. Derived from the window table rather than
 * written as 72 so the lookup (ECO-02) can never search a different span from
 * the one the reduction is graded against.
 */
export const ANTI_SPAM_WINDOW_HOURS = Math.max(
  ...ANTI_SPAM_WINDOWS.map((window) => window.withinHours),
);

/**
 * How many same-titled tasks may be completed at full reward in one day before
 * the reduction applies regardless of when they were created.
 *
 * NFR-TASK-1 as written punishes a participant who plans a week of "Gym" tasks
 * on Sunday and completes two of them inside 24 h — legitimate planning, graded
 * as farming. ECO-02 therefore exempts duplicates that existed *before* the
 * previous completion, and this allowance is what stops that exemption becoming
 * a hole: creating twenty identical tasks in one batch buys three full rewards,
 * not twenty. Deviation from Requirements §NFR-TASK-1, recorded there.
 */
export const FULL_REWARD_REPEATS_PER_DAY = 3;

/**
 * #224 — the earning cooldown that replaces `NFR-TASK-2`'s daily cap.
 *
 * After `EARNING_WINDOW_TASKS` rewarded *whole-task* completions (subtasks
 * don't count toward the window), task completions stop earning coins and XP
 * for a cooldown. The cooldown's length is tier-weighted: a window of three
 * Epic tasks earns the full `COOLDOWN_MAX_MINUTES`, three Trivial ones only
 * `COOLDOWN_MIN_MINUTES`. Streak and achievements are unaffected during a
 * cooldown; the task still completes. See
 * `design_handoff/ADDENDUM-earning-cooldown.md`.
 */
export const EARNING_WINDOW_TASKS = 3;
export const COOLDOWN_MIN_MINUTES = 20;
export const COOLDOWN_MAX_MINUTES = 60;

/**
 * `round5(20 + (avgTier − 1) / 4 · 40)` minutes, clamped to
 * `[COOLDOWN_MIN_MINUTES, COOLDOWN_MAX_MINUTES]` — a linear map from the mean
 * `complexityTier` (1…5) of the window's tasks onto the 20–60 minute spread,
 * rounded to the nearest 5 so the number shown to the participant is tidy.
 * Pure; the window's tiers arrive from `economy.ts`'s `grantEarnings`.
 */
export function cooldownMinutesFor(tiers: number[]): number {
  const avgTier =
    tiers.length > 0 ? tiers.reduce((sum, t) => sum + t, 0) / tiers.length : 1;
  const raw =
    COOLDOWN_MIN_MINUTES +
    ((avgTier - 1) / 4) * (COOLDOWN_MAX_MINUTES - COOLDOWN_MIN_MINUTES);
  const clamped = Math.min(
    COOLDOWN_MAX_MINUTES,
    Math.max(COOLDOWN_MIN_MINUTES, raw),
  );
  return Math.round(clamped / 5) * 5;
}

/**
 * The coin → XP conversion (§3.1, ECO-06).
 *
 * Priced as "meaningful cost, not a shortcut": 100 coins is between two and
 * three Medium tasks' worth of coins for 40 XP, less than one Medium task's XP.
 * Buying levels is deliberately worse value than earning them, so the store —
 * where the study's urgency stimuli live — stays the interesting thing to spend
 * coins on.
 */
export const BUY_XP_COST_COINS = 100;
export const BUY_XP_GAIN_XP = 40;

const HOUR_MS = 60 * 60 * 1000;

const clampInt = (value: number) => Math.max(0, Math.round(value));

const isTier = (tier: number): tier is ComplexityTier =>
  Number.isInteger(tier) && tier >= 1 && tier <= 5;

/**
 * The untouched payout for a tier.
 *
 * An out-of-range tier resolves to Trivial rather than throwing: the column is
 * a plain Int and a bad value should cost a participant the smallest possible
 * reward, not 500 them mid-completion.
 */
export function baseReward(tier: number): Reward {
  const { coins, xp } = COMPLEXITY_TIERS[isTier(tier) ? tier : 1];
  return { coins, xp };
}

/** How a completion landed against its due date. */
export type Efficiency = {
  kind: "early" | "on-time" | "late" | "no-due-date";
  /** Whole calendar days past the due date. 0 unless `kind` is "late". */
  daysLate: number;
};

/**
 * Classifies a completion. A task with no due date is treated as on-time — it
 * had no deadline to beat or miss, so neither the bonus nor the penalty is
 * earned.
 */
export function efficiencyOf(
  dueDate: Date | null | undefined,
  completedAt: Date,
): Efficiency {
  if (!dueDate) return { kind: "no-due-date", daysLate: 0 };

  const days = calendarDaysBetween(dueDate, completedAt);
  if (days < 0) return { kind: "early", daysLate: 0 };
  if (days === 0) return { kind: "on-time", daysLate: 0 };
  return { kind: "late", daysLate: days };
}

/** Applies §3.3 to coins only. XP passes through untouched at every stage. */
export function applyEfficiency(
  reward: Reward,
  efficiency: Efficiency,
): Reward {
  if (efficiency.kind === "early") {
    return {
      coins: clampInt(reward.coins * (1 + EARLY_COIN_BONUS)),
      xp: reward.xp,
    };
  }

  if (efficiency.kind === "late") {
    return {
      coins: clampInt(
        reward.coins - efficiency.daysLate * LATE_COIN_PENALTY_PER_DAY,
      ),
      xp: reward.xp,
    };
  }

  return { ...reward };
}

/** The coin bonus a streak length has earned, as a fraction (0, .1, .2, .35). */
export function streakBonusFor(streak: number): number {
  return STREAK_BONUSES.find(({ days }) => streak >= days)?.bonus ?? 0;
}

/** §3.4 — coins only, again. */
export function applyStreakBonus(reward: Reward, streak: number): Reward {
  const bonus = streakBonusFor(streak);
  if (bonus === 0) return { ...reward };

  return { coins: clampInt(reward.coins * (1 + bonus)), xp: reward.xp };
}

/**
 * The fraction of a reward that survives a repeat of the same task title.
 *
 * `null` (never completed before, or longer ago than the widest window) keeps
 * the full reward. ECO-02 owns finding that timestamp; this is the table it
 * reads from.
 */
export function antiSpamKeepFor(
  lastCompletedAt: Date | null | undefined,
  completedAt: Date,
): number {
  if (!lastCompletedAt) return 1;

  const hours = (completedAt.getTime() - lastCompletedAt.getTime()) / HOUR_MS;
  // A negative gap means the "last" completion is in the future relative to
  // this one — out-of-order data, not farming. Treat it as no reduction.
  if (hours < 0) return 1;

  return ANTI_SPAM_WINDOWS.find(({ withinHours }) => hours < withinHours)?.keep ?? 1;
}

/**
 * NFR-TASK-1 — scales both coins and XP down, then lifts the result to the
 * floor.
 *
 * The floor only lifts a value that had something to lose: a late task already
 * reduced to 0 coins stays at 0. Lifting it to 1 would mean a repeat of an
 * overdue task paid *more* than a single completion of it, which is the exact
 * behaviour the guardrail exists to prevent.
 */
export function applyAntiSpam(reward: Reward, keep: number): Reward {
  if (keep >= 1) return { ...reward };

  const reduce = (value: number, floor: number) =>
    value <= 0 ? 0 : Math.max(floor, clampInt(value * keep));

  return {
    coins: reduce(reward.coins, ANTI_SPAM_FLOOR.coins),
    xp: reduce(reward.xp, ANTI_SPAM_FLOOR.xp),
  };
}

/** Everything the pipeline needs to price one completion. */
export type RewardInput = {
  /** Task.complexityTier. */
  tier: number;
  /** Task.dueDate — null or absent means no deadline. */
  dueDate?: Date | null;
  /** When the completion happened. */
  completedAt: Date;
  /** UserEconomy.streak, *after* ECO-04 has recorded today. */
  streak?: number;
  /**
   * Fraction of the reward the anti-spam guardrail lets through, from ECO-02's
   * `antiSpamCheck`. Defaults to 1 (no reduction).
   *
   * Passed in rather than derived here from a timestamp: the guardrail exempts
   * duplicates that were planned in advance, so the surviving fraction is not a
   * function of the time gap alone. `antiSpamKeepFor` below is still the table
   * that fraction comes from — ECO-02 decides *whether* to consult it.
   */
  antiSpamKeep?: number;
  /**
   * Fraction of the parent task's reward this grant is worth (SUB-3). 1 for a
   * whole task; a subtask passes 1/subtaskCount.
   */
  share?: number;
};

/** Every stage's output, kept for the completion toast and for telemetry. */
export type RewardBreakdown = {
  base: Reward;
  afterEfficiency: Reward;
  afterStreak: Reward;
  afterAntiSpam: Reward;
  /** What to write to the economy row — the end of the pricing pipeline. The
   * #224 cooldown gate (`grantEarnings`) may still zero this out before it
   * lands, but that is banking, not pricing. */
  granted: Reward;
  efficiency: Efficiency;
  streakBonus: number;
  antiSpamKeep: number;
};

/**
 * Prices one completion end to end: base tier → efficiency → streak → anti-spam.
 *
 * Rounds to whole coins/XP at every stage rather than once at the end — the
 * balance a participant sees is an integer, and compounding a hidden fraction
 * through three multipliers would make the displayed breakdown fail to add up.
 *
 * There is no cap stage any more (#224 retired `NFR-TASK-2`); whether this
 * reward is actually banked or withheld by a cooldown is `grantEarnings`'s
 * call, not the pricing pipeline's.
 */
export function calculateReward(input: RewardInput): RewardBreakdown {
  const share = input.share ?? 1;
  const full = baseReward(input.tier);
  const base: Reward =
    share === 1
      ? full
      : { coins: clampInt(full.coins * share), xp: clampInt(full.xp * share) };

  const efficiency = efficiencyOf(input.dueDate, input.completedAt);
  const afterEfficiency = applyEfficiency(base, efficiency);

  const streakBonus = streakBonusFor(input.streak ?? 0);
  const afterStreak = applyStreakBonus(afterEfficiency, input.streak ?? 0);

  const antiSpamKeep = input.antiSpamKeep ?? 1;
  const afterAntiSpam = applyAntiSpam(afterStreak, antiSpamKeep);

  return {
    base,
    afterEfficiency,
    afterStreak,
    afterAntiSpam,
    granted: afterAntiSpam,
    efficiency,
    streakBonus,
    antiSpamKeep,
  };
}

/**
 * The XP level curve (INF-21).
 *
 * One table, one place. The level-up service (ECO-05) and the header XP bar
 * (INF-12) both read from here — a second copy of these numbers anywhere else
 * would eventually disagree with this one, and a participant seeing a different
 * level in the header than the store gate applies is a broken study instrument.
 *
 * Values are the agreed curve in claude-memory/economy_system.md: a hockey stick
 * that hands out levels 1-5 inside the first session (~3-6 tasks) for the early
 * dopamine hit, then steepens sharply for 6-10. Changing any of them changes the
 * store gates (economy_system.md's gate table) and the study's exposure
 * schedule, so update that document too.
 *
 * Pure arithmetic, no imports — safe in client components and in the proxy.
 */

/** Cumulative XP needed to *reach* each level. Index 0 is level 1. */
export const LEVEL_THRESHOLDS = [
  0, // Lv 1
  8, // Lv 2
  20, // Lv 3
  35, // Lv 4
  55, // Lv 5
  200, // Lv 6
  500, // Lv 7
  900, // Lv 8
  1400, // Lv 9
  2000, // Lv 10
] as const;

/** The curve tops out here — the store's highest gate (economy_system.md). */
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

/**
 * Total XP needed to reach `level`.
 *
 * Clamped at both ends rather than throwing: this is called with values that
 * came from the database, and a level outside the table should degrade to the
 * nearest real threshold, not take down the page that renders it.
 */
export function xpForLevel(level: number): number {
  const index = Math.min(Math.max(Math.floor(level), 1), MAX_LEVEL) - 1;
  return LEVEL_THRESHOLDS[index];
}

/** The level a given lifetime XP total earns. Never below 1, never above 10. */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let index = 1; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (xp < LEVEL_THRESHOLDS[index]) break;
    level = index + 1;
  }
  return level;
}

/** Everything the XP bar needs to draw itself. */
export type LevelProgress = {
  /** Level this XP total earns. */
  level: number;
  /** The XP total it was derived from, floored at 0. */
  xp: number;
  /** Next level, or null at the cap. */
  nextLevel: number | null;
  /** Lifetime XP that next level needs, or null at the cap. */
  xpForNextLevel: number | null;
  /** XP earned since the current level began — the bar's numerator. */
  xpIntoLevel: number;
  /** Width of the current level's band — the bar's denominator. Null at the cap. */
  xpLevelSpan: number | null;
  /** XP still to earn before the next level. 0 at the cap. */
  xpToNext: number;
  /** Bar fill, 0-100, within the current level. 100 at the cap. */
  percent: number;
  isMaxLevel: boolean;
};

/**
 * Resolves an XP total into what the header draws (INF-12).
 *
 * `percent` measures progress *within the current level* — the bar empties on
 * level-up and fills again. This deviates from the mock, whose dashboard header
 * draws the bar against the cumulative threshold ("42 / 55 XP" at 76% full on
 * level 4); a per-level bar puts that same user at 35%. Chosen deliberately:
 * against the cumulative total the later bands read as almost-full the instant
 * you arrive in them (level 9 starts at 70%), so the bar stops conveying
 * progress exactly where the curve gets punishing.
 *
 * The consequence for INF-12: the header's numeric label has to read
 * `xpIntoLevel / xpLevelSpan` ("7 / 20 XP"), not the mock's `xp /
 * xpForNextLevel` — a relative bar beside an absolute label would disagree.
 */
export function levelProgress(xp: number): LevelProgress {
  const total = Math.max(0, Math.floor(xp));
  const level = levelForXp(total);
  const levelStart = xpForLevel(level);

  if (level >= MAX_LEVEL) {
    return {
      level: MAX_LEVEL,
      xp: total,
      nextLevel: null,
      xpForNextLevel: null,
      xpIntoLevel: total - levelStart,
      xpLevelSpan: null,
      xpToNext: 0,
      percent: 100,
      isMaxLevel: true,
    };
  }

  const nextLevel = level + 1;
  const xpForNextLevel = xpForLevel(nextLevel);
  const xpLevelSpan = xpForNextLevel - levelStart;

  return {
    level,
    xp: total,
    nextLevel,
    xpForNextLevel,
    xpIntoLevel: total - levelStart,
    xpLevelSpan,
    xpToNext: xpForNextLevel - total,
    percent: ((total - levelStart) / xpLevelSpan) * 100,
    isMaxLevel: false,
  };
}

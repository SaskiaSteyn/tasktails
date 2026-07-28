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
  /** Total XP that next level needs, or null at the cap. */
  xpForNextLevel: number | null;
  /** XP still to earn. 0 at the cap. */
  xpToNext: number;
  /** Bar fill, 0-100. 100 at the cap. */
  percent: number;
  isMaxLevel: boolean;
};

/**
 * Resolves an XP total into what the header draws (INF-12).
 *
 * `percent` is measured against the *cumulative* threshold, not the span since
 * the current level began — the design's dashboard header reads "XP TO LVL 5 ·
 * 42 / 55 XP" with the bar at 42/55, so the bar never resets to empty on
 * level-up. That is deliberate in the mock; keep it.
 */
export function levelProgress(xp: number): LevelProgress {
  const total = Math.max(0, Math.floor(xp));
  const level = levelForXp(total);

  if (level >= MAX_LEVEL) {
    return {
      level: MAX_LEVEL,
      xp: total,
      nextLevel: null,
      xpForNextLevel: null,
      xpToNext: 0,
      percent: 100,
      isMaxLevel: true,
    };
  }

  const nextLevel = level + 1;
  const xpForNextLevel = xpForLevel(nextLevel);

  return {
    level,
    xp: total,
    nextLevel,
    xpForNextLevel,
    xpToNext: xpForNextLevel - total,
    percent: Math.min(100, (total / xpForNextLevel) * 100),
    isMaxLevel: false,
  };
}

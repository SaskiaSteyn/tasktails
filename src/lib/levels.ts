/**
 * The XP level curve (INF-21).
 *
 * One table, one place. The level-up service (ECO-05) and the header XP bar
 * (INF-12) both read from here — a second copy of these numbers anywhere else
 * would eventually disagree with this one, and a participant seeing a different
 * level in the header than the store gate applies is a broken study instrument.
 *
 * Values are the agreed curve in claude-memory/economy_system.md and
 * design_handoff/ADDENDUM-xp-curve.md. Changing any of them changes when the
 * store gates open (the catalogue's `levelRequired` field in prisma/seed.ts)
 * and the study's exposure schedule, so update those together.
 *
 * REBALANCED AGAIN 2026-08-11 (issue #160 — "too easy to gain xp and level
 * up"). The 2026-07-29 rebalance fixed the same-sitting jump for small tasks
 * but still let a single Epic task (200 XP) clear three thresholds from a
 * fresh account (old Lv 1→4). This curve also doubles the cap from 10 to 20
 * levels and re-derives everything around two pacing targets instead of the
 * old ~150 XP/day-only assumption:
 *
 *   - Level 10 = 1,050 XP — reached in exactly 7 days of *normal* use
 *     (~150 XP/day, the documented average).
 *   - Level 20 = 5,500 XP (hard cap, no tail past it) — reached in exactly
 *     12 days only by *hard grinding* (~460 XP/day, ~92% of the daily cap,
 *     sustained every day). Normal-pace users land around Lv 12-13 by the
 *     end of the 14-day study — finishing the curve is grind-only by design.
 *
 * The multi-level-jump bug is fixed structurally, not just for the first few
 * levels: every pair of consecutive gaps sums to more than 200 XP (one Epic
 * task's full value), so a single Epic task can never clear more than one
 * level anywhere in the curve. This is tighter than it sounds at the very
 * start — Level 1 (0 XP) + one Epic task (200 XP) lands 10 XP short of Level
 * 3's 210 — but it holds everywhere.
 *
 * The property from the old curve is preserved, just at different levels: Lv
 * 5 (425) sits below the 500 XP/day cap (NFR-TASK-2) but Lv 6 (540) sits
 * above it, so a participant who maxes the cap on day one still cannot reach
 * Lv 6 — now the boundary between the Common and Rare item-rarity bands in
 * the catalogue (see ADDENDUM-xp-curve.md) — until day two.
 *
 * The old "second/third animal type" story pinned to specific levels
 * (Lv 7 / Lv 10) is retired. The catalogue now spreads all 22 animals across
 * the curve like every other category (Johan, 2026-08-11) rather than
 * special-casing two of them.
 *
 * Pure arithmetic, no imports — safe in client components and in the proxy.
 */

/** Cumulative XP needed to *reach* each level. Index 0 is level 1. Hard cap at 20 — no level past this. */
export const LEVEL_THRESHOLDS = [
  0, // Lv 1
  40, // Lv 2 — ~2 small tasks, the one intentional instant win
  210, // Lv 3
  315, // Lv 4
  425, // Lv 5 — under the 500/day cap, deliberately
  540, // Lv 6 — over the cap; Common/Rare catalogue boundary
  660, // Lv 7
  785, // Lv 8
  915, // Lv 9
  1050, // Lv 10 — normal pace (~150 XP/day) reaches this in exactly 7 days
  1270, // Lv 11
  1540, // Lv 12
  1860, // Lv 13
  2230, // Lv 14
  2650, // Lv 15
  3120, // Lv 16 — Legendary catalogue tier begins
  3640, // Lv 17
  4210, // Lv 18
  4830, // Lv 19
  5500, // Lv 20 — hard cap; hard-grind pace (~460 XP/day) reaches this in exactly 12 days
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

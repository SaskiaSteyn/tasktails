/**
 * The 5 complexity tiers (TASK-3, economy_system.md §"Task Complexity → Rewards").
 *
 * Shared between the tier badge (TASK-01) and, later, the reward calculation
 * service (ECO-01) — one table so the badge a task shows and the coins it
 * actually pays out can never drift apart. `coins`/`xp` here are the tier's
 * base values before ECO-01's efficiency/streak/anti-spam modifiers apply.
 *
 * `color` names a `--color-tier-*` token from globals.css, not a literal
 * value — callers build Tailwind classes from it (e.g. `text-tier-${color}`).
 */
export type TaskTier = {
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  color: "trivial" | "small" | "medium" | "large" | "epic";
  coins: number;
  xp: number;
};

export const TASK_TIERS: readonly TaskTier[] = [
  { tier: 1, label: "Trivial", color: "trivial", coins: 5, xp: 8 },
  { tier: 2, label: "Small", color: "small", coins: 15, xp: 20 },
  { tier: 3, label: "Medium", color: "medium", coins: 35, xp: 45 },
  { tier: 4, label: "Large", color: "large", coins: 75, xp: 100 },
  { tier: 5, label: "Epic", color: "epic", coins: 150, xp: 200 },
];

/** Falls back to Trivial for a value outside 1-5 rather than throwing on bad data. */
export function taskTier(tier: number): TaskTier {
  return TASK_TIERS.find((t) => t.tier === tier) ?? TASK_TIERS[0];
}

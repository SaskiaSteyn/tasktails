import { StoreItemCategory } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { completedTaskCount, taskCount } from "@/lib/tasks";

/**
 * The three onboarding quests and whether each one is met (ONB-01..ONB-03).
 *
 * Requirements ONB-1 fixes the wording of all three — "Add a task", "Complete
 * a task", "Buy a pet" — so the labels are defined here beside the counts
 * rather than in the component: the API (ONB-03) and the widget (ONB-01) must
 * not be able to disagree about what a goal is called.
 *
 * All three are one-shot (target 1), simplified on 2026-07-29 from the original
 * "Complete 3 tasks / Buy 1 animal / Feed 3 animals today". The quests are a
 * runway into the economy, not a challenge, and the old set asked for seven
 * separate actions across three subsystems before it cleared. `target` stays in
 * the shape anyway so a later multi-step quest doesn't need a new one.
 *
 * SERVER ONLY — imports Prisma.
 *
 * Same rule as src/lib/tasks.ts and src/lib/users.ts about storage access:
 * counting tasks is delegated to `taskCount()`/`completedTaskCount()` rather
 * than reaching for `prisma.task` here. `Transaction` has no module of its own
 * yet — STOR-11 is still To Do — so that one `count()` lives here for now and
 * should move when that module lands.
 */

/** Stable keys — copy can change without breaking a caller keying off a goal. */
export type OnboardingGoalKey = "add-task" | "complete-task" | "buy-pet";

export type OnboardingGoal = {
  key: OnboardingGoalKey;
  /** Requirements ONB-1's wording, verbatim. */
  label: string;
  /** Clamped to `target` — a fourth completed task still reads as 3/3. */
  progress: number;
  target: number;
  complete: boolean;
};

export type OnboardingStatus = {
  goals: OnboardingGoal[];
  /** 0-100, each goal weighted equally. Rounded. */
  percent: number;
  /** How many of the three are met. */
  completed: number;
  /** All three met. */
  complete: boolean;
};

const TARGETS = {
  "add-task": 1,
  "complete-task": 1,
  "buy-pet": 1,
} as const;

const LABELS: Record<OnboardingGoalKey, string> = {
  "add-task": "Add a task",
  "complete-task": "Complete a task",
  "buy-pet": "Buy a pet",
};

/**
 * How many animals this user has bought.
 *
 * Counts *purchases* rather than `Pet` rows, because "Buy a pet" is about the
 * transaction: PET-11 turns an animal purchase into a `Pet`, so counting pets
 * would make this quest depend on a ticket that hasn't shipped, and would
 * silently un-tick if a pet were ever removed.
 */
async function animalsBought(userId: string): Promise<number> {
  return prisma.transaction.count({
    where: { userId, storeItem: { category: StoreItemCategory.ANIMALS } },
  });
}

/** Assembles a goal, clamping progress so a count can't overrun its target. */
function goalOf(key: OnboardingGoalKey, raw: number): OnboardingGoal {
  const target = TARGETS[key];
  return {
    key,
    label: LABELS[key],
    progress: Math.min(raw, target),
    target,
    complete: raw >= target,
  };
}

/**
 * Rolls the three goals up into the header ring's figure.
 *
 * Equal weight per goal, on each goal's own fraction. With every target at 1
 * that is just "completed over three", but the fraction form is kept so a
 * multi-step quest would roll up sensibly without a second formula.
 * (The mock's ring is drawn at 17% against its own state, which matches no
 * stated rule; it's placeholder artwork, so the honest formula wins over
 * reproducing the number.)
 */
export function summarise(goals: OnboardingGoal[]): OnboardingStatus {
  const fraction = goals.reduce((sum, g) => sum + g.progress / g.target, 0);

  return {
    goals,
    percent: Math.round((fraction / goals.length) * 100),
    completed: goals.filter((g) => g.complete).length,
    complete: goals.every((g) => g.complete),
  };
}

/** The three quests' live status for one user. */
export async function onboardingStatus(
  userId: string,
): Promise<OnboardingStatus> {
  const [added, completed, pets] = await Promise.all([
    taskCount(userId),
    completedTaskCount(userId),
    animalsBought(userId),
  ]);

  return summarise([
    goalOf("add-task", added),
    goalOf("complete-task", completed),
    goalOf("buy-pet", pets),
  ]);
}

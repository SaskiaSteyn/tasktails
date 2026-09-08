import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { grantEarnings, mergeLevelUps, recordStreakDay } from "@/lib/economy";
import { calculateReward } from "@/lib/rewards";
import { markSubtaskComplete, taskForUser } from "@/lib/tasks";

/**
 * SUB-05 — `POST /api/tasks/[id]/subtasks/[subId]/complete`. Marks a
 * subtask done and grants its proportional share of the parent's reward
 * (Requirements §3.5).
 *
 * **The parent is not auto-completed** (#253), which is a departure from
 * SUB-4 as written. Finishing the last subtask used to close the task in the
 * same request, so the row a participant had just been working on vanished
 * under their finger; they now tick the parent themselves when they mean to.
 * SUB-4's other half still holds — the parent pays no *additional* reward,
 * because `/complete` prices it on the shares still open, and by then there
 * are none (see that route).
 *
 * **Forward-only**, same rule as TASK-11: no un-complete, for the same
 * reason (unwinding a streak day/cap/level correctly is real scope neither
 * ticket asked for). `markSubtaskComplete()`'s atomic `completedAt: null`
 * guard is what actually stops a double-grant from two requests racing each
 * other; the checks below are the fast, readable path for the common case.
 *
 * **No anti-spam reduction** — NFR-TASK-1/ECO-02 grades a *task's* repeat
 * history by title (`Task.titleKey`), and `Subtask` has neither a title key
 * nor its own completion history to grade against. Deliberately out of
 * scope for this ticket rather than invented.
 *
 * **Streak and the #224 earning cooldown both apply**, same pipeline as
 * TASK-11 — `recordStreakDay()` runs before pricing, and `grantEarnings()`
 * banks through the cooldown gate. But a subtask completion passes
 * `advancesWindow: false`: it earns its share when earning is open (and
 * earns nothing while a cooldown is active, like any completion), but it
 * does **not** count toward the 3-task window or trigger a cooldown — only
 * whole-task completions do (ADDENDUM-earning-cooldown.md O2). A subtask is
 * real progress, just not a window slot of its own.
 *
 * Order of operations:
 *  1. Look up the task (ownership + 404) and the subtask within it, and
 *     reject if either is already complete — a task that's already done
 *     already paid out its full reward (directly or via its other
 *     subtasks), so a further subtask grant on top would double-pay it.
 *  2. Mark the subtask complete — the atomic gate.
 *  3. `recordStreakDay()`, then `calculateReward()` with `split` set to this
 *     subtask's position among its siblings (Requirements §3.5's worked
 *     example), then `grantEarnings()`. `splitShare()` allocates on the
 *     running total rather than rounding `total / count` per subtask, so the
 *     shares add up to the parent's reward exactly — rounding each one
 *     separately paid 16 coins for a 15-coin Small task split two ways
 *     (#236).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; subId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: taskId, subId } = await params;

  const task = await taskForUser(userId, taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (task.completedAt) {
    return NextResponse.json(
      { error: "Task is already complete." },
      { status: 409 },
    );
  }

  const subtask = task.subtasks.find((candidate) => candidate.id === subId);
  if (!subtask) {
    return NextResponse.json({ error: "Subtask not found." }, { status: 404 });
  }
  if (subtask.completedAt) {
    return NextResponse.json(
      { error: "Subtask is already complete." },
      { status: 409 },
    );
  }

  const completedAt = new Date();

  const completed = await markSubtaskComplete(taskId, subId, completedAt);
  if (!completed) {
    return NextResponse.json(
      { error: "Subtask is already complete." },
      { status: 409 },
    );
  }

  const streakUpdate = await recordStreakDay(userId, completedAt);

  const priced = calculateReward({
    tier: task.complexityTier,
    dueDate: task.dueDate,
    completedAt,
    streak: streakUpdate?.streak ?? 0,
    split: {
      indices: [task.subtasks.findIndex((candidate) => candidate.id === subId)],
      count: task.subtasks.length,
    },
  });

  const grant = await grantEarnings(
    userId,
    priced.granted,
    { taskId, tier: task.complexityTier, advancesWindow: false },
    completedAt,
  );

  // PRO-09 — one of the three trigger points (task/subtask completion,
  // purchase, pet interaction); see `evaluateAchievements()`'s doc comment.
  const { unlocked: achievementsUnlocked, levelUp: achievementLevelUp } =
    await evaluateAchievements(userId);

  if (!streakUpdate || !grant) {
    return NextResponse.json({
      subtask: completed,
      reward: null,
      streak: null,
      levelUp: achievementLevelUp,
      achievementsUnlocked,
    });
  }

  return NextResponse.json({
    subtask: completed,
    reward: {
      granted: grant.granted,
      onCooldown: grant.onCooldown,
      cooldownStarted: grant.cooldownStarted,
      cooldownUntil: grant.cooldown?.until.toISOString() ?? null,
      windowRemaining: grant.windowRemaining,
    },
    streak: { value: streakUpdate.streak, event: streakUpdate.event },
    // Merged, not two events — see the task-complete route's identical note.
    levelUp: mergeLevelUps(grant.levelUp, achievementLevelUp),
    achievementsUnlocked,
  });
}

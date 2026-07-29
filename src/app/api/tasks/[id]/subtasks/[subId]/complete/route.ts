import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { grantEarnings, recordStreakDay } from "@/lib/economy";
import { calculateReward } from "@/lib/rewards";
import { markSubtaskComplete, markTaskComplete, taskForUser } from "@/lib/tasks";

/**
 * SUB-05 — `POST /api/tasks/[id]/subtasks/[subId]/complete`. Marks a
 * subtask done, grants its proportional share of the parent's reward
 * (Requirements §3.5), and auto-completes the parent once every subtask is
 * done (SUB-4) — with no reward of its own, since the subtasks have already
 * split it between them.
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
 * **Streak and the daily cap both apply**, same pipeline as TASK-11 —
 * `recordStreakDay()` runs before pricing (so the completion that reaches
 * day 3 earns that day's bonus) and `grantEarnings()` banks against the
 * real daily allowance. A subtask completion is real progress on real
 * effort; there's no requirements basis for treating it as economically
 * inert just because it isn't `Task.completedAt` itself.
 *
 * Order of operations:
 *  1. Look up the task (ownership + 404) and the subtask within it, and
 *     reject if either is already complete — a task that's already done
 *     already paid out its full reward (directly or via its other
 *     subtasks), so a further subtask grant on top would double-pay it.
 *  2. Mark the subtask complete — the atomic gate.
 *  3. `recordStreakDay()`, then `calculateReward()` with `share` set to
 *     `1 / subtasks.length` (Requirements §3.5's worked example), then
 *     `grantEarnings()`.
 *  4. If every subtask is now complete, mark the parent task complete too
 *     (SUB-4) — `markTaskComplete()` directly, not through the reward
 *     pipeline, so nothing is granted for it.
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
    share: 1 / task.subtasks.length,
  });

  const grant = await grantEarnings(userId, priced.granted, completedAt);

  // SUB-4 — every subtask done means the parent is done too, with no
  // reward of its own (already fully distributed across the subtasks).
  const allSubtasksDone = task.subtasks.every(
    (candidate) => candidate.id === subId || candidate.completedAt !== null,
  );
  const parentTask = allSubtasksDone
    ? await markTaskComplete(userId, taskId, completedAt)
    : null;

  if (!streakUpdate || !grant) {
    return NextResponse.json({
      subtask: completed,
      task: parentTask,
      reward: null,
      streak: null,
      levelUp: null,
    });
  }

  return NextResponse.json({
    subtask: completed,
    task: parentTask,
    reward: {
      granted: grant.granted,
      withheld: grant.withheld,
      capReached: grant.capReached,
    },
    streak: { value: streakUpdate.streak, event: streakUpdate.event },
    levelUp: grant.levelUp,
  });
}

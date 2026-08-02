import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { antiSpamCheck, grantEarnings, recordStreakDay } from "@/lib/economy";
import { calculateReward } from "@/lib/rewards";
import { markTaskComplete, taskForUser } from "@/lib/tasks";

/**
 * TASK-11 — `POST /api/tasks/[id]/complete`. Marks a task done and runs the
 * full ECO-01..05 pipeline against it.
 *
 * **Forward-only**: there is no un-complete. The mock's "reverse on
 * un-complete, clamp at 0" isn't in TASK-05's or TASK-11's ticket text, and
 * reversing a grant correctly means undoing a streak day, daily-cap
 * counters and a level, potentially crossing a threshold backwards — real
 * scope neither ticket asked for. `markTaskComplete()`'s atomic
 * `completedAt: null` guard is what actually prevents a double-grant from
 * two requests racing each other; the ownership/already-complete checks
 * below are the fast, readable path for the common case.
 *
 * Order of operations matters and mirrors `economy.ts`'s own docs:
 *  1. Mark the task complete first — the atomic gate. If this fails,
 *     nothing else runs and nothing is granted.
 *  2. `recordStreakDay()` *before* pricing — the completion that reaches
 *     day 3 must itself see the bumped streak to earn that day's bonus.
 *  3. `antiSpamCheck()` against the *original* task (title/createdAt from
 *     before this completion) — its own history, not this write.
 *  4. `calculateReward()` prices the completion but is deliberately not
 *     given `earnedToday` — the real daily-cap application, with its own
 *     locked read, is `grantEarnings()`'s job below. Pricing without a cap
 *     figure just means nothing is capped at this stage.
 *  5. `grantEarnings()` banks the priced reward against the *real*,
 *     lock-read daily allowance and returns the level-up event, if any.
 *  6. `evaluateAchievements()` (PRO-09) re-checks the whole badge catalogue
 *     against the account's now-updated progress — this is one of the
 *     three trigger points the ticket names, the others being a purchase
 *     and a pet interaction.
 *
 * If `recordStreakDay`/`grantEarnings` come back null (no `UserEconomy`
 * row — in practice an impossible state, since AUTH-04 creates one with
 * the account), the task stays marked complete and the response reports no
 * reward rather than throwing: the completion itself is more real than a
 * defensive error would be useful.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const task = await taskForUser(userId, id);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (task.completedAt) {
    return NextResponse.json(
      { error: "Task is already complete." },
      { status: 409 },
    );
  }

  const completedAt = new Date();

  const completed = await markTaskComplete(userId, id, completedAt);
  if (!completed) {
    return NextResponse.json(
      { error: "Task is already complete." },
      { status: 409 },
    );
  }

  const [streakUpdate, antiSpam] = await Promise.all([
    recordStreakDay(userId, completedAt),
    antiSpamCheck(
      userId,
      { id: task.id, title: task.title, createdAt: task.createdAt },
      completedAt,
    ),
  ]);

  const priced = calculateReward({
    tier: task.complexityTier,
    dueDate: task.dueDate,
    completedAt,
    streak: streakUpdate?.streak ?? 0,
    antiSpamKeep: antiSpam.keep,
  });

  const grant = await grantEarnings(userId, priced.granted, completedAt);
  await evaluateAchievements(userId);

  if (!streakUpdate || !grant) {
    return NextResponse.json({
      task: completed,
      reward: null,
      streak: null,
      levelUp: null,
    });
  }

  return NextResponse.json({
    task: completed,
    reward: {
      granted: grant.granted,
      withheld: grant.withheld,
      capReached: grant.capReached,
    },
    streak: { value: streakUpdate.streak, event: streakUpdate.event },
    levelUp: grant.levelUp,
  });
}

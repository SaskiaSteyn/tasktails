import type { Subtask, Task } from "@/generated/prisma/client";

import { startOfDay, startOfNextDay } from "@/lib/day";
import { prisma } from "@/lib/prisma";
import { ANTI_SPAM_WINDOW_HOURS } from "@/lib/rewards";

/**
 * Every read and write of a task (INF-02, TASK-01/07..11).
 *
 * Same rule as src/lib/users.ts and src/lib/economy.ts: nothing outside this
 * module touches `prisma.task`.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { Task };

/** A task with its subtasks attached (SUB-01's read shape for the edit screen). */
export type TaskWithSubtasks = Task & { subtasks: Subtask[] };

const HOUR_MS = 60 * 60 * 1000;

/**
 * All of a user's tasks, incomplete ones first (what the dashboard needs to
 * show), then by due date (soonest first, undated last), then oldest first
 * within a tie.
 */
export async function tasksForUser(userId: string): Promise<Task[]> {
  return prisma.task.findMany({
    where: { userId },
    orderBy: [
      { completedAt: { sort: "asc", nulls: "first" } },
      { dueDate: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
  });
}

/**
 * A single task, scoped to its owner (TASK-03). Returns null both when the
 * id doesn't exist and when it belongs to someone else — the caller can't
 * tell the difference, which is the point: confirming a task id belongs to
 * another user is its own information leak.
 *
 * Includes subtasks (SUB-01) ordered by id — cuid ids are k-sortable, so this
 * reads as creation order without a separate `createdAt` column on `Subtask`.
 */
export async function taskForUser(
  userId: string,
  taskId: string,
): Promise<TaskWithSubtasks | null> {
  return prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { subtasks: { orderBy: { id: "asc" } } },
  });
}

/**
 * The normalised form the anti-spam guardrail matches on (ECO-02).
 *
 * Trimmed, inner whitespace collapsed, lowercased. Two completions of
 * "  Reply   to email " and "reply to email" are the same task to a
 * participant, so they have to be the same task to the guardrail.
 *
 * This must stay in step with the backfill expression in the
 * `eco02_task_title_key` migration, which normalises existing rows the same
 * way. If they drift, tasks written either side of that migration stop matching
 * each other.
 */
export function titleKeyOf(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The display form: trimmed and whitespace-collapsed, but case preserved.
 *
 * Normalising on write as well as storing the key is belt and braces — the key
 * makes the *match* exact, this makes the task list tidy and keeps the two
 * columns describing the same string.
 */
export function normaliseTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

/**
 * Creates a task for the given user (TASK-08), deriving `titleKey` so no
 * caller has to know it exists. No reward is calculated or granted here —
 * coins/XP are only ever earned on completion (TASK-11).
 */
export async function createTask(
  userId: string,
  input: { title: string; complexityTier: number; dueDate?: Date | null },
): Promise<Task> {
  const title = normaliseTitle(input.title);

  return prisma.task.create({
    data: {
      userId,
      title,
      titleKey: titleKeyOf(title),
      complexityTier: input.complexityTier,
      dueDate: input.dueDate ?? null,
    },
  });
}

/**
 * Adds a subtask to a task (SUB-04), scoped to the task's owner. Returns
 * null both when the task id doesn't exist and when it belongs to someone
 * else — same "can't tell the difference" reasoning as `taskForUser()`.
 *
 * `Subtask` has no `userId` of its own, so ownership has to be checked
 * against its parent `Task` before the insert rather than folded into a
 * single scoped write the way `updateTask()`/`deleteTask()` do.
 *
 * No reward math here — SUB-05's completion endpoint is where a subtask
 * earns anything, same as `createTask()` grants nothing at creation.
 */
export async function createSubtask(
  userId: string,
  taskId: string,
  title: string,
): Promise<Subtask | null> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });
  if (!task) return null;

  return prisma.subtask.create({
    data: { taskId, title: normaliseTitle(title) },
  });
}

/**
 * Edits a task (TASK-09). Retitling rewrites `titleKey` with it — a task
 * whose key still described its old title would be graded against the
 * wrong history.
 *
 * Scoped by userId as well as id so a participant cannot edit someone
 * else's task by guessing an id; `updateMany` rather than `update` because
 * a compound where clause on a non-unique field is what that scoping needs
 * — a mismatched owner fails as "0 rows" rather than a thrown "record not
 * found", same reasoning as `taskForUser()`.
 */
export async function updateTask(
  userId: string,
  taskId: string,
  changes: { title?: string; complexityTier?: number; dueDate?: Date | null },
): Promise<Task | null> {
  const title =
    changes.title === undefined ? undefined : normaliseTitle(changes.title);

  const { count } = await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: {
      ...(title === undefined ? {} : { title, titleKey: titleKeyOf(title) }),
      ...(changes.complexityTier === undefined
        ? {}
        : { complexityTier: changes.complexityTier }),
      ...(changes.dueDate === undefined ? {} : { dueDate: changes.dueDate }),
    },
  });

  return count === 0 ? null : taskForUser(userId, taskId);
}

/**
 * Deletes a task, scoped to its owner (TASK-10). `deleteMany`, same reason
 * as `updateTask()`'s `updateMany` — a mismatched owner fails as "0 rows"
 * rather than a thrown "record not found". Subtasks cascade at the schema
 * level (`Subtask.task` is `onDelete: Cascade`), so there's nothing extra
 * to delete here for those.
 *
 * Returns whether a row was actually deleted, so the route can tell a real
 * delete from "there was nothing to delete" and 404 accordingly.
 */
export async function deleteTask(
  userId: string,
  taskId: string,
): Promise<boolean> {
  const { count } = await prisma.task.deleteMany({
    where: { id: taskId, userId },
  });
  return count > 0;
}

/**
 * Marks a task complete, scoped to its owner (TASK-11). `completedAt: null`
 * in the `where` clause, not just a pre-check in the caller, is what makes
 * this the actual guard against completing the same task twice — two
 * requests racing each other both pass a "not complete yet" pre-check, but
 * only one of them matches this `updateMany`'s where clause, since the
 * first one's write has already flipped `completedAt` by the time the
 * second reaches the database. Returns null (not completed) rather than
 * throwing, so the caller can't double-grant a reward for a task that was
 * already done — completing it forward-only, with no un-complete, keeps
 * that guarantee simple to reason about.
 */
export async function markTaskComplete(
  userId: string,
  taskId: string,
  completedAt: Date,
): Promise<Task | null> {
  const { count } = await prisma.task.updateMany({
    where: { id: taskId, userId, completedAt: null },
    data: { completedAt },
  });

  return count === 0 ? null : taskForUser(userId, taskId);
}

/** The shared filter behind both anti-spam lookups. */
function sameTitleFilter(userId: string, titleKey: string, excludeTaskId?: string) {
  return {
    userId,
    titleKey,
    ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
  };
}

/**
 * When this user last completed a task with this title, or null.
 *
 * The window defaults to the widest anti-spam band (72 h) — anything older
 * carries no reduction, so there is no reason to read it. Bounded by
 * `completedAt` at the top end as well as the bottom so a completion recorded
 * with a backdated timestamp is compared against what came *before* it.
 */
export async function lastCompletionOfTitle(
  userId: string,
  title: string,
  options: {
    /** The completion being priced — the window ends here. */
    completedAt: Date;
    /** Widen or narrow the search. Defaults to the anti-spam window. */
    withinHours?: number;
    /** The task being completed, so it can't match itself. */
    excludeTaskId?: string;
  },
): Promise<Date | null> {
  const titleKey = titleKeyOf(title);
  if (!titleKey) return null;

  const windowHours = options.withinHours ?? ANTI_SPAM_WINDOW_HOURS;
  const since = new Date(options.completedAt.getTime() - windowHours * HOUR_MS);

  const previous = await prisma.task.findFirst({
    where: {
      ...sameTitleFilter(userId, titleKey, options.excludeTaskId),
      completedAt: { gte: since, lte: options.completedAt },
    },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  return previous?.completedAt ?? null;
}

/**
 * How many tasks with this title the user has already completed today.
 *
 * Feeds the per-title daily allowance: a batch of identical tasks planned in
 * advance is legitimate, but only up to a point, and after that point the
 * reduction applies regardless of when they were created.
 */
export async function completionsOfTitleToday(
  userId: string,
  title: string,
  options: { completedAt: Date; excludeTaskId?: string },
): Promise<number> {
  const titleKey = titleKeyOf(title);
  if (!titleKey) return 0;

  return prisma.task.count({
    where: {
      ...sameTitleFilter(userId, titleKey, options.excludeTaskId),
      completedAt: {
        gte: startOfDay(options.completedAt),
        lt: startOfNextDay(options.completedAt),
      },
    },
  });
}

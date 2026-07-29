import type { Task } from "@/generated/prisma/client";

import { startOfDay, startOfNextDay } from "@/lib/day";
import { prisma } from "@/lib/prisma";
import { ANTI_SPAM_WINDOW_HOURS } from "@/lib/rewards";

/**
 * Every read and write of a task (INF-02).
 *
 * Same rule as src/lib/users.ts and src/lib/economy.ts: nothing outside this
 * module touches `prisma.task`. It starts with the write path and the two
 * queries ECO-02 needs, and grows into the rest as TASK-07..11 land.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { Task };

const HOUR_MS = 60 * 60 * 1000;

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

/** Creates a task, deriving `titleKey` so no caller has to know it exists. */
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
 * Edits a task. Retitling rewrites the key with it — a task whose key still
 * described its old title would be graded against the wrong history.
 *
 * Scoped by userId as well as id so a participant cannot edit someone else's
 * task by guessing an id; `updateMany` rather than `update` because a compound
 * where clause on a non-unique field is what that scoping needs.
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

  if (count === 0) return null;
  return prisma.task.findUnique({ where: { id: taskId } });
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

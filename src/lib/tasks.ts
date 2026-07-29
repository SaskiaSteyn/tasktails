import type { Task } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Every read of a user's tasks (INF-02, TASK-01).
 *
 * Same rule as src/lib/users.ts and src/lib/economy.ts: nothing outside this
 * module touches `prisma.task`, so the writes (TASK-08..11) land in one place
 * when they arrive.
 *
 * TASK-09/TASK-10 (edit/delete) don't exist yet, so there's still no write
 * side here for TASK-03's edit screen to call — see its own file for the
 * stubbed submit/delete this is deliberately missing.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { Task };

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
 */
export async function taskForUser(
  userId: string,
  taskId: string,
): Promise<Task | null> {
  return prisma.task.findFirst({ where: { id: taskId, userId } });
}

/**
 * Creates a task for the given user (TASK-08). No reward is calculated or
 * granted here — coins/XP are only ever earned on completion (TASK-11),
 * which doesn't exist yet either.
 */
export async function createTask(
  userId: string,
  data: { title: string; complexityTier: number; dueDate: Date | null },
): Promise<Task> {
  return prisma.task.create({
    data: {
      userId,
      title: data.title,
      complexityTier: data.complexityTier,
      dueDate: data.dueDate,
    },
  });
}

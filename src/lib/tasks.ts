import type { Task } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Every read of a user's tasks (INF-02, TASK-01).
 *
 * Same rule as src/lib/users.ts and src/lib/economy.ts: nothing outside this
 * module touches `prisma.task`, so the writes (TASK-08..11) land in one place
 * when they arrive.
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

/**
 * Edits a task's title/dueDate/complexityTier, scoped to its owner
 * (TASK-09). `updateMany`, not `update` — the where clause isn't a unique
 * key on its own (`id` is, but `userId` scopes it to the owner too), and
 * `updateMany` is what lets a mismatched owner fail as "0 rows" instead of
 * a thrown "record not found". Returns null in that case, same as
 * `taskForUser()` — a task id that's someone else's reads the same as one
 * that doesn't exist.
 */
export async function updateTask(
  userId: string,
  taskId: string,
  data: { title: string; complexityTier: number; dueDate: Date | null },
): Promise<Task | null> {
  const { count } = await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: {
      title: data.title,
      complexityTier: data.complexityTier,
      dueDate: data.dueDate,
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

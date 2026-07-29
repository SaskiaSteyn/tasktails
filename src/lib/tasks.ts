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

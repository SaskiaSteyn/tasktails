import { beforeEach, describe, expect, it } from "vitest";

import { markTaskComplete } from "@/lib/tasks";
import { prismaMock } from "@/test/prisma-mock";

/**
 * Issue #198 ("not all sub tasks get ticked, and they cannot be ticked
 * afterward either") — completing a task directly (TASK-11) used to leave
 * any still-open subtasks stranded: `Task.completedAt` was set but the
 * subtasks' own `completedAt` never was, and SUB-05's route refuses to
 * touch a subtask once its parent is already complete, so those subtasks
 * could never be ticked afterward. `markTaskComplete()` now closes out any
 * open subtasks in the same transaction as the parent.
 */
describe("markTaskComplete", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
  });

  it("marks any still-open subtasks complete alongside the task", async () => {
    prismaMock.task.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.subtask.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.task.findFirst.mockResolvedValue({ id: "task-1" } as never);

    const completedAt = new Date("2026-08-25T12:00:00Z");
    await markTaskComplete("user-1", "task-1", completedAt);

    expect(prismaMock.subtask.updateMany).toHaveBeenCalledWith({
      where: { taskId: "task-1", completedAt: null },
      data: { completedAt },
    });
  });

  it("does not touch subtasks when the task was already complete", async () => {
    // The atomic guard: `where: { completedAt: null }` matches nothing for
    // an already-complete task, same race-safety `markTaskComplete()`'s own
    // doc comment describes.
    prismaMock.task.updateMany.mockResolvedValue({ count: 0 });

    const result = await markTaskComplete(
      "user-1",
      "task-1",
      new Date("2026-08-25T12:00:00Z"),
    );

    expect(result).toBeNull();
    expect(prismaMock.subtask.updateMany).not.toHaveBeenCalled();
  });

  it("returns the task with its subtasks attached", async () => {
    prismaMock.task.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.subtask.updateMany.mockResolvedValue({ count: 0 });
    const completedTask = {
      id: "task-1",
      subtasks: [{ id: "sub-1", completedAt: new Date() }],
    };
    prismaMock.task.findFirst.mockResolvedValue(completedTask as never);

    const result = await markTaskComplete(
      "user-1",
      "task-1",
      new Date("2026-08-25T12:00:00Z"),
    );

    expect(result).toEqual(completedTask);
  });
});

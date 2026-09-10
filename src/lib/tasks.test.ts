import { beforeEach, describe, expect, it } from "vitest";

import { splitShare } from "@/lib/rewards";
import { deleteSubtask, markTaskComplete, renameSubtask } from "@/lib/tasks";
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

/**
 * #273 — subtasks can be renamed and deleted. The delete carries an economy
 * guard, so that is what most of this covers.
 */
describe("deleteSubtask", () => {
  it("refuses a completed subtask, in the where clause rather than a pre-check", async () => {
    prismaMock.subtask.deleteMany.mockResolvedValue({ count: 0 });

    expect(await deleteSubtask("task-1", "sub-1")).toBe(false);
    expect(prismaMock.subtask.deleteMany).toHaveBeenCalledWith({
      where: { id: "sub-1", taskId: "task-1", completedAt: null },
    });
  });

  it("deletes an incomplete subtask", async () => {
    prismaMock.subtask.deleteMany.mockResolvedValue({ count: 1 });

    expect(await deleteSubtask("task-1", "sub-1")).toBe(true);
  });

  it("is why the guard exists: dropping a paid subtask would overpay the parent", () => {
    // A 15-coin task split three ways. The first subtask banks its share...
    const banked = splitShare(15, 3, 0);
    expect(banked).toBe(5);

    // ...and if it could then be deleted, the two survivors would re-split
    // the parent's *full* reward on a count of 2 rather than the 10 coins
    // actually left, paying 20 against a 15-coin task.
    const afterDelete = splitShare(15, 2, 0) + splitShare(15, 2, 1);
    expect(banked + afterDelete).toBe(20);

    // Deleting an *incomplete* one only ever under-pays, which is why it is
    // allowed: same first share, then one survivor priced on a count of 2.
    expect(banked + splitShare(15, 2, 1)).toBe(12);
  });
});

describe("renameSubtask", () => {
  it("scopes the write to the parent task and normalises the title", async () => {
    prismaMock.subtask.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.subtask.findFirst.mockResolvedValue({ id: "sub-1" } as never);

    await renameSubtask("task-1", "sub-1", "  Write   the  method  ");

    expect(prismaMock.subtask.updateMany).toHaveBeenCalledWith({
      where: { id: "sub-1", taskId: "task-1" },
      data: { title: "Write the method" },
    });
  });

  it("returns null when the subtask is not on that task", async () => {
    prismaMock.subtask.updateMany.mockResolvedValue({ count: 0 });

    expect(await renameSubtask("task-1", "someone-elses", "Nope")).toBeNull();
    expect(prismaMock.subtask.findFirst).not.toHaveBeenCalled();
  });
});

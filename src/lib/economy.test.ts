import { describe, expect, it, vi } from "vitest";

import { antiSpamCheck, reduceForRepeats } from "@/lib/economy";
import { prismaMock } from "@/test/prisma-mock";

/**
 * ECO-02 — the repeat-completion guardrail (NFR-TASK-1) plus its two
 * exemptions, exercised against the mocked Prisma client so the actual query
 * shapes are asserted rather than stubbed away.
 *
 * `@/auth` is mocked because economy.ts imports it for `currentEconomy`;
 * nothing here signs in.
 */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const at = (day: number, hour = 12) => new Date(2026, 6, day, hour, 0);

const completedTask = (completedAt: Date) => ({ completedAt }) as never;

/** No previous completion, none today — the default the tests override. */
function noHistory() {
  prismaMock.task.findFirst.mockResolvedValue(null);
  prismaMock.task.count.mockResolvedValue(0);
}

describe("antiSpamCheck", () => {
  it("keeps the full reward when the title has not been completed before", async () => {
    noHistory();

    const check = await antiSpamCheck(
      "user-1",
      { title: "Reply to email", createdAt: at(20, 8) },
      at(20),
    );

    expect(check).toEqual({
      lastCompletedAt: null,
      keep: 1,
      reduced: false,
      reason: "first-completion",
      completionsToday: 0,
    });
  });

  it("searches the last 72 h for the same normalised title key", async () => {
    noHistory();

    await antiSpamCheck(
      "user-1",
      { id: "task-9", title: "  Reply   To   EMAIL " },
      at(20),
    );

    const where = prismaMock.task.findFirst.mock.calls[0][0]?.where as never as {
      userId: string;
      titleKey: string;
      completedAt: { gte: Date; lte: Date };
      id: { not: string };
    };

    expect(where.userId).toBe("user-1");
    expect(where.titleKey).toBe("reply to email");
    expect(where.id).toEqual({ not: "task-9" });
    // 72 h back from the completion, and never past it.
    expect(where.completedAt.gte).toEqual(at(17));
    expect(where.completedAt.lte).toEqual(at(20));
  });

  it("counts today's completions of the title over the calendar day", async () => {
    noHistory();

    await antiSpamCheck("user-1", { title: "Gym" }, at(20, 15));

    const where = prismaMock.task.count.mock.calls[0][0]?.where as never as {
      titleKey: string;
      completedAt: { gte: Date; lt: Date };
    };

    expect(where.titleKey).toBe("gym");
    expect(where.completedAt.gte).toEqual(new Date(2026, 6, 20, 0, 0));
    expect(where.completedAt.lt).toEqual(new Date(2026, 6, 21, 0, 0));
  });

  it("reduces a task created after the last completion of its title", async () => {
    // The farming pattern: complete, then make another one just like it.
    prismaMock.task.findFirst.mockResolvedValue(completedTask(at(20, 1)));
    prismaMock.task.count.mockResolvedValue(1);

    const check = await antiSpamCheck(
      "user-1",
      { title: "Reply to email", createdAt: at(20, 2) },
      at(20),
    );

    expect(check.keep).toBe(0.5);
    expect(check.reason).toBe("repeat");
  });

  it("exempts a duplicate that existed before the last completion", async () => {
    // A week of "Gym" planned on Sunday: the task predates the completion it is
    // being graded against, so it was not spawned to farm.
    prismaMock.task.findFirst.mockResolvedValue(completedTask(at(20, 1)));
    prismaMock.task.count.mockResolvedValue(1);

    const check = await antiSpamCheck(
      "user-1",
      { title: "Gym", createdAt: at(19, 9) },
      at(20),
    );

    expect(check.keep).toBe(1);
    expect(check.reduced).toBe(false);
    expect(check.reason).toBe("planned-ahead");
  });

  it("stops exempting once the day's allowance for that title is spent", async () => {
    // Same pre-planned task, but it is the fourth "Gym" of the day.
    prismaMock.task.findFirst.mockResolvedValue(completedTask(at(20, 1)));
    prismaMock.task.count.mockResolvedValue(3);

    const check = await antiSpamCheck(
      "user-1",
      { title: "Gym", createdAt: at(19, 9) },
      at(20),
    );

    expect(check.keep).toBe(0.5);
    expect(check.reduced).toBe(true);
    expect(check.reason).toBe("daily-allowance-spent");
    expect(check.completionsToday).toBe(3);
  });

  it("treats an unknown creation time as a repeat, not as planned ahead", async () => {
    prismaMock.task.findFirst.mockResolvedValue(completedTask(at(20, 1)));
    prismaMock.task.count.mockResolvedValue(0);

    const check = await antiSpamCheck("user-1", { title: "Gym" }, at(20));

    expect(check.reason).toBe("repeat");
    expect(check.reduced).toBe(true);
  });

  it("grades the three windows off the previous completion", async () => {
    // Created after every one of the previous completions below, so no
    // planned-ahead exemption applies and the raw bands show through.
    const farmed = { title: "Walk dog", createdAt: at(20, 11) };

    prismaMock.task.count.mockResolvedValue(0);

    // 11 h ago → 50%.
    prismaMock.task.findFirst.mockResolvedValue(completedTask(at(20, 1)));
    expect((await antiSpamCheck("user-1", farmed, at(20))).keep).toBe(0.5);

    // 25 h ago → 25%.
    prismaMock.task.findFirst.mockResolvedValue(completedTask(at(19, 11)));
    expect((await antiSpamCheck("user-1", farmed, at(20))).keep).toBe(0.25);

    // 49 h ago → 10%.
    prismaMock.task.findFirst.mockResolvedValue(completedTask(at(18, 11)));
    expect((await antiSpamCheck("user-1", farmed, at(20))).keep).toBe(0.1);
  });

  it("does not query at all for a blank title", async () => {
    const check = await antiSpamCheck("user-1", { title: "   " }, at(20));

    expect(prismaMock.task.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.task.count).not.toHaveBeenCalled();
    expect(check.reduced).toBe(false);
  });
});

describe("reduceForRepeats", () => {
  it("applies the reduction and reports why", async () => {
    prismaMock.task.findFirst.mockResolvedValue(completedTask(at(20, 1)));
    prismaMock.task.count.mockResolvedValue(1);

    const { reward, check } = await reduceForRepeats(
      { coins: 35, xp: 45 },
      "user-1",
      { title: "Reply to email", createdAt: at(20, 2) },
      at(20),
    );

    expect(reward).toEqual({ coins: 18, xp: 23 });
    expect(check.reduced).toBe(true);
    expect(check.lastCompletedAt).toEqual(at(20, 1));
  });

  it("leaves a first completion untouched", async () => {
    noHistory();

    const { reward } = await reduceForRepeats(
      { coins: 35, xp: 45 },
      "user-1",
      { title: "Reply to email", createdAt: at(20, 8) },
      at(20),
    );

    expect(reward).toEqual({ coins: 35, xp: 45 });
  });
});

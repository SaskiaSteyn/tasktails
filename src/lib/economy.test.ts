import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  antiSpamCheck,
  dailyAllowanceOf,
  grantEarnings,
  nextStreak,
  recordStreakDay,
  reduceForRepeats,
} from "@/lib/economy";
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

/**
 * ECO-03 — the daily cap (NFR-TASK-2).
 *
 * `grantEarnings` runs inside an interactive transaction and reads the row with
 * `SELECT … FOR UPDATE`, so the mock has to stand in for both: the transaction
 * callback is handed the same deep mock, and `$queryRaw` returns the locked row.
 */
describe("dailyAllowanceOf", () => {
  const today = new Date(2026, 6, 20, 14, 0);

  it("reports what is left of the cap", () => {
    const allowance = dailyAllowanceOf(
      {
        dailyCoinsEarned: 120,
        dailyXpEarned: 200,
        dailyCapResetAt: new Date(2026, 6, 20, 8, 0),
      },
      today,
    );

    expect(allowance.earned).toEqual({ coins: 120, xp: 200 });
    expect(allowance.remaining).toEqual({ coins: 180, xp: 300 });
    expect(allowance.coinCapReached).toBe(false);
    expect(allowance.resetsAt).toEqual(new Date(2026, 6, 21, 0, 0));
  });

  it("reads counters from a previous day as a clean slate", () => {
    const allowance = dailyAllowanceOf(
      {
        dailyCoinsEarned: 300,
        dailyXpEarned: 500,
        dailyCapResetAt: new Date(2026, 6, 19, 23, 59),
      },
      today,
    );

    expect(allowance.earned).toEqual({ coins: 0, xp: 0 });
    expect(allowance.remaining).toEqual({ coins: 300, xp: 500 });
  });

  it("flags each cap independently once it is spent", () => {
    const allowance = dailyAllowanceOf(
      {
        dailyCoinsEarned: 300,
        dailyXpEarned: 10,
        dailyCapResetAt: today,
      },
      today,
    );

    expect(allowance.coinCapReached).toBe(true);
    expect(allowance.xpCapReached).toBe(false);
  });
});

describe("grantEarnings", () => {
  const now = new Date(2026, 6, 20, 14, 0);

  /** Stands the locked row up and hands the transaction the same mock. */
  function economyRow(counters: {
    dailyCoinsEarned: number;
    dailyXpEarned: number;
    dailyCapResetAt: Date;
  }) {
    prismaMock.$queryRaw.mockResolvedValue([counters]);
    prismaMock.userEconomy.update.mockResolvedValue({
      ...counters,
      coins: 0,
      xp: 0,
    } as never);
  }

  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
  });

  it("banks the whole reward when there is room", async () => {
    economyRow({
      dailyCoinsEarned: 0,
      dailyXpEarned: 0,
      dailyCapResetAt: now,
    });

    const grant = await grantEarnings("user-1", { coins: 35, xp: 45 }, now);

    expect(grant?.granted).toEqual({ coins: 35, xp: 45 });
    expect(grant?.capReached).toBe(false);

    const data = prismaMock.userEconomy.update.mock.calls[0][0].data as never as {
      coins: { increment: number };
      dailyCoinsEarned: { increment: number };
    };
    expect(data.coins).toEqual({ increment: 35 });
    expect(data.dailyCoinsEarned).toEqual({ increment: 35 });
  });

  it("trims a grant to the remaining headroom", async () => {
    economyRow({
      dailyCoinsEarned: 290,
      dailyXpEarned: 480,
      dailyCapResetAt: now,
    });

    const grant = await grantEarnings("user-1", { coins: 150, xp: 200 }, now);

    expect(grant?.granted).toEqual({ coins: 10, xp: 20 });
    expect(grant?.withheld).toEqual({ coins: 140, xp: 180 });
    expect(grant?.capReached).toBe(true);
  });

  it("banks nothing once the cap is spent, and still returns a result", async () => {
    economyRow({
      dailyCoinsEarned: 300,
      dailyXpEarned: 500,
      dailyCapResetAt: now,
    });

    const grant = await grantEarnings("user-1", { coins: 35, xp: 45 }, now);

    expect(grant?.granted).toEqual({ coins: 0, xp: 0 });
    expect(grant?.withheld).toEqual({ coins: 35, xp: 45 });
  });

  it("overwrites stale counters instead of adding to them", async () => {
    economyRow({
      dailyCoinsEarned: 300,
      dailyXpEarned: 500,
      dailyCapResetAt: new Date(2026, 6, 19, 20, 0),
    });

    const grant = await grantEarnings("user-1", { coins: 35, xp: 45 }, now);

    // Yesterday's spent cap must not block today's first task.
    expect(grant?.granted).toEqual({ coins: 35, xp: 45 });

    const data = prismaMock.userEconomy.update.mock.calls[0][0].data as never as {
      dailyCoinsEarned: number;
      dailyXpEarned: number;
      dailyCapResetAt: Date;
    };
    expect(data.dailyCoinsEarned).toBe(35);
    expect(data.dailyXpEarned).toBe(45);
    expect(data.dailyCapResetAt).toEqual(new Date(2026, 6, 20, 0, 0));
  });

  it("locks the row it is about to update", async () => {
    economyRow({ dailyCoinsEarned: 0, dailyXpEarned: 0, dailyCapResetAt: now });

    await grantEarnings("user-1", { coins: 5, xp: 8 }, now);

    const sql = (prismaMock.$queryRaw.mock.calls[0][0] as unknown as string[])
      .join("")
      .replace(/\s+/g, " ");
    expect(sql).toContain("FOR UPDATE");
  });

  it("returns null when the account has no economy row", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    expect(await grantEarnings("ghost", { coins: 5, xp: 8 }, now)).toBeNull();
    expect(prismaMock.userEconomy.update).not.toHaveBeenCalled();
  });
});

/**
 * ECO-04 — the streak (§3.4). A streak day is "at least 1 task completed that
 * day", so the transition table is driven entirely by how many calendar days
 * sit between `lastStreakDate` and the completion.
 */
describe("nextStreak", () => {
  const now = new Date(2026, 6, 20, 14, 0);
  const daysBefore = (days: number) =>
    new Date(2026, 6, 20 - days, 21, 0);

  it("starts a streak on the first completion an account ever has", () => {
    const update = nextStreak({ streak: 0, lastStreakDate: null }, now);

    expect(update).toEqual({
      streak: 1,
      previousStreak: 0,
      event: "started",
      isFirstToday: true,
      bonus: 0,
    });
  });

  it("extends when yesterday was a streak day", () => {
    const update = nextStreak({ streak: 6, lastStreakDate: daysBefore(1) }, now);

    expect(update.streak).toBe(7);
    expect(update.event).toBe("extended");
    expect(update.isFirstToday).toBe(true);
    // Crossing 7 puts the 20% coin bonus in force for this very completion.
    expect(update.bonus).toBe(0.2);
  });

  it("does not move on the second completion of the same day", () => {
    const update = nextStreak(
      { streak: 4, lastStreakDate: new Date(2026, 6, 20, 8, 0) },
      now,
    );

    expect(update.streak).toBe(4);
    expect(update.event).toBe("already-counted");
    expect(update.isFirstToday).toBe(false);
  });

  it("breaks back to 1 when a day was missed", () => {
    const update = nextStreak({ streak: 13, lastStreakDate: daysBefore(2) }, now);

    expect(update.streak).toBe(1);
    expect(update.previousStreak).toBe(13);
    expect(update.event).toBe("broken");
    expect(update.bonus).toBe(0);
  });

  it("does not re-count a date in the future", () => {
    // Clock skew or a backdated completion must not inflate a streak.
    const update = nextStreak(
      { streak: 3, lastStreakDate: new Date(2026, 6, 22, 9, 0) },
      now,
    );

    expect(update.streak).toBe(3);
    expect(update.event).toBe("already-counted");
    expect(update.isFirstToday).toBe(false);
  });

  it("carries the §3.4 bonus thresholds", () => {
    const onDay = (streak: number) =>
      nextStreak({ streak: streak - 1, lastStreakDate: daysBefore(1) }, now)
        .bonus;

    expect(onDay(2)).toBe(0);
    expect(onDay(3)).toBe(0.1);
    expect(onDay(7)).toBe(0.2);
    expect(onDay(14)).toBe(0.35);
  });
});

describe("recordStreakDay", () => {
  const now = new Date(2026, 6, 20, 14, 0);

  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
  });

  it("writes the new counter and local midnight on the first completion of a day", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { streak: 2, lastStreakDate: new Date(2026, 6, 19, 22, 0) },
    ]);

    const update = await recordStreakDay("user-1", now);

    expect(update?.streak).toBe(3);
    expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { streak: 3, lastStreakDate: new Date(2026, 6, 20, 0, 0) },
    });
  });

  it("writes nothing on a later completion the same day", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { streak: 3, lastStreakDate: new Date(2026, 6, 20, 9, 0) },
    ]);

    const update = await recordStreakDay("user-1", now);

    expect(update?.event).toBe("already-counted");
    expect(prismaMock.userEconomy.update).not.toHaveBeenCalled();
  });

  it("locks the row it is about to update", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { streak: 0, lastStreakDate: null },
    ]);

    await recordStreakDay("user-1", now);

    const sql = (prismaMock.$queryRaw.mock.calls[0][0] as unknown as string[])
      .join("")
      .replace(/\s+/g, " ");
    expect(sql).toContain("FOR UPDATE");
  });

  it("returns null when the account has no economy row", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    expect(await recordStreakDay("ghost", now)).toBeNull();
    expect(prismaMock.userEconomy.update).not.toHaveBeenCalled();
  });
});

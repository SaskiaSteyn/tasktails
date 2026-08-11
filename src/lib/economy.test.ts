import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  antiSpamCheck,
  buyXp,
  dailyAllowanceOf,
  grantEarnings,
  levelUpBetween,
  nextStreak,
  recordStreakDay,
  reduceForRepeats,
  syncLevel,
  xpWrite,
} from "@/lib/economy";
import { levelForXp } from "@/lib/levels";
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
      lifetimeCoinsEarned: { increment: number };
      dailyCoinsEarned: { increment: number };
    };
    expect(data.coins).toEqual({ increment: 35 });
    expect(data.lifetimeCoinsEarned).toEqual({ increment: 35 });
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

    // Lifetime earned tracks the capped, actually-banked amount — not the
    // task's pre-cap face value.
    const data = prismaMock.userEconomy.update.mock.calls[0][0].data as never as {
      lifetimeCoinsEarned: { increment: number };
    };
    expect(data.lifetimeCoinsEarned).toEqual({ increment: 10 });
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

/**
 * ECO-05 — level-up against INF-21's threshold table. The curve hands out
 * levels 2–5 inside a first session (§3.6), so crossing several thresholds on
 * one completion is the normal case here, not an edge case.
 */
describe("levelUpBetween", () => {
  it("returns null when no threshold was crossed", () => {
    expect(levelUpBetween(20, 30)).toBeNull();
    expect(levelUpBetween(0, 7)).toBeNull();
  });

  it("reports a single crossing", () => {
    const event = levelUpBetween(0, 40);

    expect(event).toEqual({
      from: 1,
      to: 2,
      levelsGained: [2],
      xp: 40,
      isMaxLevel: false,
    });
  });

  it("lists every level when one completion crosses several", () => {
    // One Epic task is 200 XP, which clears levels 2 (40), 3 (110) and 4 (190)
    // in a single completion — the widest jump a single task can produce under
    // the 2026-07-29 curve. It used to reach level 6.
    const event = levelUpBetween(0, 200);

    expect(event?.to).toBe(4);
    expect(event?.levelsGained).toEqual([2, 3, 4]);

    // Requirements §3.6's first-session simulation, 1 trivial + 2 small, now
    // stops at level 2 rather than sweeping up to 4.
    expect(levelUpBetween(0, 48)?.to).toBe(2);
  });

  it("flags the top of the curve", () => {
    const event = levelUpBetween(1400, 2000);

    expect(event?.to).toBe(10);
    expect(event?.isMaxLevel).toBe(true);
  });

  it("never reports a level-up for XP that did not move or went backwards", () => {
    expect(levelUpBetween(55, 55)).toBeNull();
    expect(levelUpBetween(200, 55)).toBeNull();
  });
});

describe("grantEarnings level-up", () => {
  const now = new Date(2026, 6, 20, 14, 0);

  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
    prismaMock.userEconomy.update.mockResolvedValue({
      dailyCoinsEarned: 0,
      dailyXpEarned: 0,
      dailyCapResetAt: now,
    } as never);
  });

  it("reports the crossing and writes the derived level in the same update", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { xp: 0, dailyCoinsEarned: 0, dailyXpEarned: 0, dailyCapResetAt: now },
    ]);

    // Epic — the only single tier that crosses more than one threshold now.
    const grant = await grantEarnings("user-1", { coins: 150, xp: 200 }, now);

    expect(grant?.levelUp?.from).toBe(1);
    expect(grant?.levelUp?.to).toBe(4);
    expect(grant?.levelUp?.levelsGained).toEqual([2, 3, 4]);

    const data = prismaMock.userEconomy.update.mock.calls[0][0]
      .data as never as { level: number };
    expect(data.level).toBe(4);
  });

  it("reports no level-up when the grant does not reach a threshold", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { xp: 60, dailyCoinsEarned: 0, dailyXpEarned: 0, dailyCapResetAt: now },
    ]);

    const grant = await grantEarnings("user-1", { coins: 5, xp: 8 }, now);

    expect(grant?.levelUp).toBeNull();
  });

  it("levels off the capped XP, not the XP the task was worth", async () => {
    // 495 XP already banked: the cap lets 5 through, which is not enough to
    // reach level 2 from 0. A level-up computed off the uncapped 200 would be
    // a threshold the participant never actually crossed.
    prismaMock.$queryRaw.mockResolvedValue([
      { xp: 0, dailyCoinsEarned: 0, dailyXpEarned: 495, dailyCapResetAt: now },
    ]);

    const grant = await grantEarnings("user-1", { coins: 150, xp: 200 }, now);

    expect(grant?.granted.xp).toBe(5);
    expect(grant?.levelUp).toBeNull();
  });
});

describe("syncLevel", () => {
  it("repairs a stale level column", async () => {
    // 380 is level 6's threshold.
    prismaMock.userEconomy.findUnique.mockResolvedValue({
      xp: 380,
      level: 3,
    } as never);

    const result = await syncLevel("user-1");

    expect(result).toEqual({ level: 6, corrected: true });
    expect(prismaMock.userEconomy.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { level: 6 },
    });
  });

  it("writes nothing when the column already agrees with the XP", async () => {
    prismaMock.userEconomy.findUnique.mockResolvedValue({
      xp: 380,
      level: 6,
    } as never);

    const result = await syncLevel("user-1");

    expect(result).toEqual({ level: 6, corrected: false });
    expect(prismaMock.userEconomy.update).not.toHaveBeenCalled();
  });

  it("returns null when the account has no economy row", async () => {
    prismaMock.userEconomy.findUnique.mockResolvedValue(null);

    expect(await syncLevel("ghost")).toBeNull();
  });
});

/**
 * The invariant behind ECO-05's denormalised `level` column: XP and level are
 * written together or not at all. Asserted directly, because a stale level is
 * silent — the header derives its level from `xp` and looks correct while the
 * store's level gate withholds items the participant has earned.
 */
describe("xpWrite", () => {
  it("always pairs the XP increment with the level that XP earns", () => {
    for (const [before, delta] of [
      [0, 8],
      [0, 200],
      [48, 20],
      [1990, 10],
      [500, 0],
    ] as const) {
      const write = xpWrite(before, delta);

      expect(write.data.xp).toEqual({ increment: delta });
      expect(write.data.level).toBe(levelForXp(before + delta));
    }
  });

  it("reports the crossing that the same write represents", () => {
    expect(xpWrite(0, 40).levelUp?.to).toBe(2);
    expect(xpWrite(0, 39).levelUp).toBeNull();
    // 270 + 20 = 290, crossing Lv 5's 280 threshold.
    expect(xpWrite(270, 20).levelUp?.levelsGained).toEqual([5]);
  });

  it("never derives a level from a negative total", () => {
    const write = xpWrite(10, -50);

    expect(write.xpAfter).toBe(0);
    expect(write.data.level).toBe(1);
  });
});

/**
 * ECO-06 — the coin → XP conversion (§3.1). The balance check and the deduction
 * must see the same locked row, so this asserts the lock as well as the maths.
 */
describe("buyXp", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
    prismaMock.userEconomy.update.mockResolvedValue({
      coins: 0,
      xp: 0,
    } as never);
  });

  it("takes 100 coins, adds 40 XP and moves the level with it", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 250, xp: 20 }]);

    const result = await buyXp("user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spent).toBe(100);
    expect(result.gained).toBe(40);

    const data = prismaMock.userEconomy.update.mock.calls[0][0].data as never as {
      coins: { decrement: number };
      xp: { increment: number };
      level: number;
    };
    expect(data.coins).toEqual({ decrement: 100 });
    expect(data.xp).toEqual({ increment: 40 });
    // 20 + 40 = 60 XP, still below Lv 3's 110 — stays at level 2.
    expect(data.level).toBe(2);
  });

  it("reports the level-up the purchase caused", async () => {
    // Two purchases (80 XP) from 0 crosses Lv 2 (40) only. Buying from 100 XP
    // one more purchase (140) crosses Lv 3 (110).
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 100, xp: 100 }]);

    const result = await buyXp("user-1");

    expect(result.ok && result.levelUp?.to).toBe(3);
    expect(result.ok && result.levelUp?.levelsGained).toEqual([3]);
  });

  it("refuses and writes nothing when the coins are not there", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 99, xp: 0 }]);

    const result = await buyXp("user-1");

    expect(result).toEqual({
      ok: false,
      reason: "insufficient-coins",
      coins: 99,
      shortfall: 1,
    });
    expect(prismaMock.userEconomy.update).not.toHaveBeenCalled();
  });

  it("allows a purchase that spends the balance exactly", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 100, xp: 0 }]);

    expect((await buyXp("user-1")).ok).toBe(true);
  });

  it("ignores the daily XP cap — these coins were already capped when earned", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 100, xp: 0 }]);

    const result = await buyXp("user-1");

    expect(result.ok && result.gained).toBe(40);
    const data = prismaMock.userEconomy.update.mock.calls[0][0]
      .data as never as Record<string, unknown>;
    expect(data.dailyXpEarned).toBeUndefined();
  });

  it("locks the row before checking the balance", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 100, xp: 0 }]);

    await buyXp("user-1");

    const sql = (prismaMock.$queryRaw.mock.calls[0][0] as unknown as string[])
      .join("")
      .replace(/\s+/g, " ");
    expect(sql).toContain("FOR UPDATE");
  });

  it("reports a missing account rather than throwing", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    expect(await buyXp("ghost")).toEqual({ ok: false, reason: "no-account" });
  });
});

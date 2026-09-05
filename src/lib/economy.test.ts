import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  antiSpamCheck,
  buyXp,
  earningStatusOf,
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
 * #224 — the earning window / cooldown status derived from a row.
 */
describe("earningStatusOf", () => {
  const now = new Date(2026, 6, 20, 14, 0);

  it("reports the window progress while earning is open", () => {
    const status = earningStatusOf(
      { earningWindowTiers: [3, 2], earningCooldownUntil: null },
      now,
    );
    expect(status).toEqual({ windowUsed: 2, windowSize: 3, cooldownUntil: null });
  });

  it("reads a future cooldown as full window + a resume time", () => {
    const until = new Date(now.getTime() + 15 * 60_000);
    const status = earningStatusOf(
      { earningWindowTiers: [], earningCooldownUntil: until },
      now,
    );
    expect(status.windowUsed).toBe(3);
    expect(status.cooldownUntil).toBe(until.toISOString());
  });

  it("reads an expired cooldown as earning open", () => {
    const status = earningStatusOf(
      {
        earningWindowTiers: [5, 5, 5],
        earningCooldownUntil: new Date(now.getTime() - 60_000),
      },
      now,
    );
    // Expired — treated as open; the stale window count is not surfaced.
    expect(status.cooldownUntil).toBeNull();
    expect(status.windowUsed).toBe(3);
  });
});

/**
 * #224 — `grantEarnings` banks through the cooldown gate. It runs inside an
 * interactive transaction and reads the row with `SELECT … FOR UPDATE`, so the
 * mock stands in for both: the callback is handed the same deep mock, and
 * `$queryRaw` returns the locked row.
 */
describe("grantEarnings", () => {
  const now = new Date(2026, 6, 20, 14, 0);
  const taskCtx = { taskId: "task-1", tier: 3, advancesWindow: true } as const;

  /** Stands the locked row up and the writes the transaction makes. */
  function lockedRow(row: {
    xp?: number;
    earningWindowTiers?: number[];
    earningCooldownUntil?: Date | null;
  }) {
    const full = {
      xp: row.xp ?? 0,
      coins: 0,
      earningWindowTiers: row.earningWindowTiers ?? [],
      earningCooldownUntil: row.earningCooldownUntil ?? null,
    };
    prismaMock.$queryRaw.mockResolvedValue([full]);
    prismaMock.userEconomy.update.mockResolvedValue(full as never);
    prismaMock.userEconomy.findUniqueOrThrow.mockResolvedValue(full as never);
  }

  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
  });

  it("banks the whole reward when earning is open — there is no cap", async () => {
    lockedRow({ earningWindowTiers: [] });

    const grant = await grantEarnings(
      "user-1",
      { coins: 150, xp: 200 },
      taskCtx,
      now,
    );

    expect(grant?.granted).toEqual({ coins: 150, xp: 200 });
    expect(grant?.onCooldown).toBe(false);
    expect(grant?.cooldown).toBeNull();
    expect(grant?.windowRemaining).toBe(2);

    const data = prismaMock.userEconomy.update.mock.calls[0][0].data as never as {
      coins: { increment: number };
      lifetimeCoinsEarned: { increment: number };
      earningWindowTiers: number[];
    };
    expect(data.coins).toEqual({ increment: 150 });
    expect(data.lifetimeCoinsEarned).toEqual({ increment: 150 });
    expect(data.earningWindowTiers).toEqual([3]);
  });

  it("appends the tier for a whole-task completion but not for a subtask", async () => {
    lockedRow({ earningWindowTiers: [2] });

    await grantEarnings(
      "user-1",
      { coins: 5, xp: 8 },
      { taskId: "t", tier: 4, advancesWindow: false },
      now,
    );

    const data = prismaMock.userEconomy.update.mock.calls[0][0].data as never as {
      earningWindowTiers: number[];
    };
    expect(data.earningWindowTiers).toEqual([2]); // unchanged — subtasks don't count
  });

  it("starts a cooldown on the 3rd whole-task completion, tier-weighted", async () => {
    lockedRow({ earningWindowTiers: [3, 3] });

    const grant = await grantEarnings(
      "user-1",
      { coins: 35, xp: 45 },
      { taskId: "t", tier: 3, advancesWindow: true },
      now,
    );

    // [3,3,3] → cooldownMinutesFor → 40 minutes.
    expect(grant?.cooldownStarted).toBe(true);
    expect(grant?.cooldown?.until).toEqual(new Date(now.getTime() + 40 * 60_000));
    expect(grant?.windowRemaining).toBe(0);
    // The completion that triggers it is still paid in full.
    expect(grant?.granted).toEqual({ coins: 35, xp: 45 });

    const data = prismaMock.userEconomy.update.mock.calls[0][0].data as never as {
      earningWindowTiers: number[];
      earningCooldownUntil: Date;
    };
    expect(data.earningWindowTiers).toEqual([]); // reset when the cooldown starts
    expect(data.earningCooldownUntil).toEqual(
      new Date(now.getTime() + 40 * 60_000),
    );
  });

  it("withholds both currencies during an active cooldown, writing nothing", async () => {
    const until = new Date(now.getTime() + 10 * 60_000);
    lockedRow({ earningCooldownUntil: until });

    const grant = await grantEarnings(
      "user-1",
      { coins: 35, xp: 45 },
      taskCtx,
      now,
    );

    expect(grant?.onCooldown).toBe(true);
    expect(grant?.granted).toEqual({ coins: 0, xp: 0 });
    expect(grant?.withheld).toEqual({ coins: 35, xp: 45 });
    expect(grant?.cooldown?.until).toEqual(until);
    expect(prismaMock.userEconomy.update).not.toHaveBeenCalled();
  });

  it("clears an expired cooldown and earns as a fresh window slot 1", async () => {
    lockedRow({
      earningWindowTiers: [5, 5, 5],
      earningCooldownUntil: new Date(now.getTime() - 60_000),
    });

    const grant = await grantEarnings(
      "user-1",
      { coins: 35, xp: 45 },
      { taskId: "t", tier: 2, advancesWindow: true },
      now,
    );

    expect(grant?.onCooldown).toBe(false);
    expect(grant?.granted).toEqual({ coins: 35, xp: 45 });

    const data = prismaMock.userEconomy.update.mock.calls[0][0].data as never as {
      earningWindowTiers: number[];
      earningCooldownUntil: Date | null;
    };
    expect(data.earningWindowTiers).toEqual([2]); // previous window discarded
    expect(data.earningCooldownUntil).toBeNull();
  });

  it("locks the row it is about to update", async () => {
    lockedRow({});

    await grantEarnings("user-1", { coins: 5, xp: 8 }, taskCtx, now);

    const sql = (prismaMock.$queryRaw.mock.calls[0][0] as unknown as string[])
      .join("")
      .replace(/\s+/g, " ");
    expect(sql).toContain("FOR UPDATE");
  });

  it("returns null when the account has no economy row", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    expect(
      await grantEarnings("ghost", { coins: 5, xp: 8 }, taskCtx, now),
    ).toBeNull();
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
 * ECO-05 — level-up against INF-21's threshold table. The 2026-08-11 curve
 * (issue #160) guarantees every pair of consecutive gaps sums to more than
 * 200 XP — one Epic task's full value — so a single completion can never
 * cross more than one threshold past the Level 1→2 freebie. Crossing several
 * levels at once, which the old curve allowed routinely, is no longer
 * possible at all.
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

  it("never lets a single completion cross more than one level", () => {
    // One Epic task is 200 XP — the largest single reward in the game — and
    // from a fresh account it lands 10 XP short of level 3's 210 threshold.
    // This is the bug issue #160 reported: the old curve let this same grant
    // reach level 4 (or "feel like" level 5) in one completion.
    const event = levelUpBetween(0, 200);

    expect(event?.to).toBe(2);
    expect(event?.levelsGained).toEqual([2]);

    // Starting exactly at level 2 (40 XP) and landing another Epic task still
    // only clears one threshold — level 3's 210.
    expect(levelUpBetween(40, 240)?.levelsGained).toEqual([3]);
  });

  it("flags the top of the curve", () => {
    const event = levelUpBetween(4830, 5500);

    expect(event?.to).toBe(20);
    expect(event?.isMaxLevel).toBe(true);
  });

  it("never reports a level-up for XP that did not move or went backwards", () => {
    expect(levelUpBetween(55, 55)).toBeNull();
    expect(levelUpBetween(200, 55)).toBeNull();
  });
});

describe("grantEarnings level-up", () => {
  const now = new Date(2026, 6, 20, 14, 0);
  const taskCtx = { taskId: "t", tier: 5, advancesWindow: true } as const;

  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
    prismaMock.userEconomy.update.mockResolvedValue({
      xp: 0,
      coins: 0,
      earningWindowTiers: [],
      earningCooldownUntil: null,
    } as never);
  });

  it("reports the crossing and writes the derived level in the same update", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { xp: 0, earningWindowTiers: [], earningCooldownUntil: null },
    ]);

    // Epic — no single tier crosses more than one threshold anymore.
    const grant = await grantEarnings(
      "user-1",
      { coins: 150, xp: 200 },
      taskCtx,
      now,
    );

    expect(grant?.levelUp?.from).toBe(1);
    expect(grant?.levelUp?.to).toBe(2);
    expect(grant?.levelUp?.levelsGained).toEqual([2]);

    const data = prismaMock.userEconomy.update.mock.calls[0][0]
      .data as never as { level: number };
    expect(data.level).toBe(2);
  });

  it("reports no level-up when the grant does not reach a threshold", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { xp: 60, earningWindowTiers: [], earningCooldownUntil: null },
    ]);

    const grant = await grantEarnings(
      "user-1",
      { coins: 5, xp: 8 },
      taskCtx,
      now,
    );

    expect(grant?.levelUp).toBeNull();
  });

  it("does not level up when a cooldown withholds the XP", async () => {
    // Enough XP to reach level 2 from 0 — but a cooldown is active, so the
    // grant is zeroed and no threshold is crossed.
    prismaMock.$queryRaw.mockResolvedValue([
      {
        xp: 0,
        earningWindowTiers: [],
        earningCooldownUntil: new Date(now.getTime() + 5 * 60_000),
      },
    ]);
    prismaMock.userEconomy.findUniqueOrThrow.mockResolvedValue({
      xp: 0,
      coins: 0,
      earningWindowTiers: [],
      earningCooldownUntil: new Date(now.getTime() + 5 * 60_000),
    } as never);

    const grant = await grantEarnings(
      "user-1",
      { coins: 150, xp: 200 },
      taskCtx,
      now,
    );

    expect(grant?.granted.xp).toBe(0);
    expect(grant?.levelUp).toBeNull();
  });
});

describe("syncLevel", () => {
  it("repairs a stale level column", async () => {
    // 540 is level 6's threshold.
    prismaMock.userEconomy.findUnique.mockResolvedValue({
      xp: 540,
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
      xp: 540,
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
      [5490, 10],
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
    // 520 + 20 = 540, crossing Lv 6's 540 threshold.
    expect(xpWrite(520, 20).levelUp?.levelsGained).toEqual([6]);
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
    // 20 + 40 = 60 XP, still below Lv 3's 210 — stays at level 2.
    expect(data.level).toBe(2);
  });

  it("reports the level-up the purchase caused", async () => {
    // Buying from 200 XP (level 2) adds 40, landing on 240 — past Lv 3's 210.
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 100, xp: 200 }]);

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

  it("is not subject to the #224 earning cooldown — it spends, it does not earn from tasks", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ coins: 100, xp: 0 }]);

    const result = await buyXp("user-1");

    expect(result.ok && result.gained).toBe(40);
    const data = prismaMock.userEconomy.update.mock.calls[0][0]
      .data as never as Record<string, unknown>;
    // Touches only coins + xp/level — nothing about the earning window.
    expect(data.earningWindowTiers).toBeUndefined();
    expect(data.earningCooldownUntil).toBeUndefined();
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

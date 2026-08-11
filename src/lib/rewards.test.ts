import { describe, expect, it } from "vitest";

import {
  applyAntiSpam,
  applyDailyCap,
  applyEfficiency,
  applyStreakBonus,
  antiSpamKeepFor,
  baseReward,
  calculateReward,
  efficiencyOf,
  streakBonusFor,
} from "@/lib/rewards";

/**
 * ECO-01 — the numbers in Requirements §3.2–3.4 and NFR-TASK-1/2, asserted
 * directly. Dates are built with the local-time constructor because the
 * efficiency and anti-spam rules are specified in calendar days and elapsed
 * hours respectively, both of which a participant reads off a local clock.
 */

const at = (
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
) => new Date(year, month - 1, day, hour, minute);

describe("baseReward", () => {
  it("pays the §3.2 table", () => {
    expect(baseReward(1)).toEqual({ coins: 5, xp: 8 });
    expect(baseReward(2)).toEqual({ coins: 15, xp: 20 });
    expect(baseReward(3)).toEqual({ coins: 35, xp: 45 });
    expect(baseReward(4)).toEqual({ coins: 75, xp: 100 });
    expect(baseReward(5)).toEqual({ coins: 150, xp: 200 });
  });

  it("treats an out-of-range tier as trivial rather than throwing", () => {
    expect(baseReward(0)).toEqual({ coins: 5, xp: 8 });
    expect(baseReward(9)).toEqual({ coins: 5, xp: 8 });
    expect(baseReward(2.5)).toEqual({ coins: 5, xp: 8 });
  });
});

describe("efficiencyOf", () => {
  it("counts calendar days, not 24-hour blocks", () => {
    // Due Monday midday, finished five minutes into Tuesday: one day late.
    expect(efficiencyOf(at(2026, 7, 20), at(2026, 7, 21, 0, 5))).toEqual({
      kind: "late",
      daysLate: 1,
    });
  });

  it("classifies early, on-time and missing due dates", () => {
    expect(efficiencyOf(at(2026, 7, 22), at(2026, 7, 20)).kind).toBe("early");
    expect(efficiencyOf(at(2026, 7, 20, 9), at(2026, 7, 20, 23)).kind).toBe(
      "on-time",
    );
    expect(efficiencyOf(null, at(2026, 7, 20)).kind).toBe("no-due-date");
  });
});

describe("applyEfficiency", () => {
  const medium = { coins: 35, xp: 45 };

  it("adds 25% coins for beating the due date and leaves XP alone", () => {
    expect(
      applyEfficiency(medium, { kind: "early", daysLate: 0 }),
    ).toEqual({ coins: 44, xp: 45 });
  });

  it("takes 10 coins per day late, flooring at 0", () => {
    expect(applyEfficiency(medium, { kind: "late", daysLate: 1 })).toEqual({
      coins: 25,
      xp: 45,
    });
    expect(applyEfficiency(medium, { kind: "late", daysLate: 3 })).toEqual({
      coins: 5,
      xp: 45,
    });
    expect(applyEfficiency(medium, { kind: "late", daysLate: 10 })).toEqual({
      coins: 0,
      xp: 45,
    });
  });

  it("pays the base for on-time and undated tasks", () => {
    expect(applyEfficiency(medium, { kind: "on-time", daysLate: 0 })).toEqual(
      medium,
    );
    expect(
      applyEfficiency(medium, { kind: "no-due-date", daysLate: 0 }),
    ).toEqual(medium);
  });
});

describe("streak bonus", () => {
  it("steps at 3, 7 and 14 consecutive days", () => {
    expect(streakBonusFor(0)).toBe(0);
    expect(streakBonusFor(2)).toBe(0);
    expect(streakBonusFor(3)).toBe(0.1);
    expect(streakBonusFor(6)).toBe(0.1);
    expect(streakBonusFor(7)).toBe(0.2);
    expect(streakBonusFor(13)).toBe(0.2);
    expect(streakBonusFor(14)).toBe(0.35);
    expect(streakBonusFor(40)).toBe(0.35);
  });

  it("applies to coins only", () => {
    expect(applyStreakBonus({ coins: 100, xp: 100 }, 14)).toEqual({
      coins: 135,
      xp: 100,
    });
  });
});

describe("anti-spam reduction", () => {
  const completedAt = at(2026, 7, 20, 12);

  it("keeps 50% / 25% / 10% across the three windows", () => {
    expect(antiSpamKeepFor(at(2026, 7, 20, 1), completedAt)).toBe(0.5); // 11 h
    expect(antiSpamKeepFor(at(2026, 7, 19, 11), completedAt)).toBe(0.25); // 25 h
    expect(antiSpamKeepFor(at(2026, 7, 18, 11), completedAt)).toBe(0.1); // 49 h
  });

  it("keeps the full reward beyond 72 h and for a first completion", () => {
    expect(antiSpamKeepFor(at(2026, 7, 17, 11), completedAt)).toBe(1); // 73 h
    expect(antiSpamKeepFor(null, completedAt)).toBe(1);
  });

  it("floors a reduced reward at 1 coin and 1 XP", () => {
    expect(applyAntiSpam({ coins: 5, xp: 8 }, 0.1)).toEqual({
      coins: 1,
      xp: 1,
    });
  });

  it("does not lift a zero-coin reward off the floor", () => {
    // A task already reduced to 0 coins by lateness must not pay more when it
    // is *also* a repeat.
    expect(applyAntiSpam({ coins: 0, xp: 45 }, 0.5)).toEqual({
      coins: 0,
      xp: 23,
    });
  });
});

describe("daily cap", () => {
  it("grants only the remaining headroom and reports the rest", () => {
    const capped = applyDailyCap(
      { coins: 50, xp: 60 },
      { coins: 290, xp: 480 },
    );

    expect(capped.granted).toEqual({ coins: 10, xp: 20 });
    expect(capped.withheld).toEqual({ coins: 40, xp: 40 });
    expect(capped.capReached).toBe(true);
  });

  it("caps the two currencies independently", () => {
    const capped = applyDailyCap({ coins: 50, xp: 60 }, { coins: 300, xp: 0 });

    expect(capped.granted).toEqual({ coins: 0, xp: 60 });
    expect(capped.capReached).toBe(true);
  });

  it("passes a grant through untouched when there is room", () => {
    const capped = applyDailyCap({ coins: 35, xp: 45 }, { coins: 0, xp: 0 });

    expect(capped.granted).toEqual({ coins: 35, xp: 45 });
    expect(capped.capReached).toBe(false);
  });
});

describe("calculateReward", () => {
  it("runs base → efficiency → streak → anti-spam → cap in order", () => {
    const result = calculateReward({
      tier: 3, // 35 coins, 45 XP
      dueDate: at(2026, 7, 21),
      completedAt: at(2026, 7, 20, 12), // early: 44 coins
      streak: 7, // +20%: 53 coins
      antiSpamKeep: 0.5, // ECO-02 graded it a repeat
      earnedToday: { coins: 0, xp: 0 },
    });

    expect(result.base).toEqual({ coins: 35, xp: 45 });
    expect(result.afterEfficiency).toEqual({ coins: 44, xp: 45 });
    expect(result.afterStreak).toEqual({ coins: 53, xp: 45 });
    expect(result.afterAntiSpam).toEqual({ coins: 27, xp: 23 });
    expect(result.granted).toEqual({ coins: 27, xp: 23 });
    expect(result.capReached).toBe(false);
  });

  it("pays the plain tier reward for a first, undated, streakless completion", () => {
    const result = calculateReward({
      tier: 5,
      completedAt: at(2026, 7, 20),
    });

    expect(result.granted).toEqual({ coins: 150, xp: 200 });
    expect(result.efficiency.kind).toBe("no-due-date");
    expect(result.antiSpamKeep).toBe(1);
  });

  it("splits a parent task's reward across subtasks (SUB-3)", () => {
    const result = calculateReward({
      tier: 3,
      completedAt: at(2026, 7, 20),
      share: 1 / 3,
    });

    // Requirements §3.5's worked example: ~12 coins, ~15 XP per subtask.
    expect(result.granted).toEqual({ coins: 12, xp: 15 });
  });

  it("trims the grant when the day's cap is nearly spent", () => {
    const result = calculateReward({
      tier: 5,
      completedAt: at(2026, 7, 20),
      earnedToday: { coins: 295, xp: 495 },
    });

    expect(result.afterAntiSpam).toEqual({ coins: 150, xp: 200 });
    expect(result.granted).toEqual({ coins: 5, xp: 5 });
    expect(result.withheldByCap).toEqual({ coins: 145, xp: 195 });
    expect(result.capReached).toBe(true);
  });
});

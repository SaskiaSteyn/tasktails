import { describe, expect, it } from "vitest";

import { dailyActivity, mannWhitney, median, signTest } from "./analysis";

describe("mannWhitney", () => {
  it("matches the textbook value for fully separated groups", () => {
    // n = 5 + 5, U = 25 for B; z = (12.5 − 0.5) / 4.787 → p = 0.01219.
    const result = mannWhitney([1, 2, 3, 4, 5], [6, 7, 8, 9, 10])!;
    expect(result.u).toBe(25);
    expect(result.p).toBeCloseTo(0.01219, 4);
    expect(result.r).toBe(1);
  });

  it("applies the tie correction", () => {
    // Worked by hand (R: wilcox.test(exact = FALSE) gives W = 2.5, p = 0.1366).
    const result = mannWhitney([1, 2, 2, 3], [2, 3, 4, 5])!;
    expect(result.u).toBe(13.5);
    expect(result.p).toBeCloseTo(0.1366, 3);
    expect(result.r).toBeCloseTo(0.6875);
  });

  it("is symmetric and handles no difference", () => {
    expect(mannWhitney([6, 7, 8], [1, 2, 3])!.r).toBe(-1);
    expect(mannWhitney([0, 0, 0], [0, 0])).toEqual({ u: 3, p: 1, r: 0 });
    expect(mannWhitney([], [1])).toBeNull();
  });
});

describe("median", () => {
  it("handles odd, even and empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("dailyActivity", () => {
  const joined = new Date("2026-09-01T10:00:00Z");
  const at = (day: number) => new Date(joined.getTime() + (day - 1) * 86_400_000 + 3_600_000);
  const participant = (id: string, group: "A" | "B", joinedAt: Date, visitDays: number[]) => ({
    id,
    studyId: id,
    group,
    joinedAt,
    coinsEarned: 0,
    events: visitDays.map((day) => ({ type: "STORE_VISIT" as const, at: at(day), coins: 0, items: 0, durationMs: 0 })),
    taskCompletions: [],
  });

  it("aligns on each participant's own day 1 and only averages over those who reached a day", () => {
    const now = new Date(joined.getTime() + 2.5 * 86_400_000); // day 3 for the first two
    const chart = dailyActivity(
      [
        participant("a1", "A", joined, [1, 1, 3]),
        participant("a2", "A", joined, [2]),
        // Joined a day later: only on its day 2, so it counts towards days 1–2 only.
        participant("a3", "A", new Date(joined.getTime() + 86_400_000), []),
      ],
      now,
    );
    const visits = chart.series.find((s) => s.key === "storeVisits")!;
    expect(chart.days).toHaveLength(14);
    expect(chart.reached.A.slice(0, 4)).toEqual([3, 3, 2, 0]);
    expect(visits.A.slice(0, 4)).toEqual([2 / 3, 1 / 3, 1 / 2, null]);
    expect(visits.B[0]).toBeNull();
  });
});

describe("signTest", () => {
  it("matches the binomial tail", () => {
    expect(signTest(8, 0)).toBeCloseTo(2 / 256); // 0.0078
    expect(signTest(7, 3)).toBeCloseTo(0.34375); // 2 × 176/1024
    expect(signTest(3, 3)).toBe(1);
    expect(signTest(0, 0)).toBeNull();
  });
});

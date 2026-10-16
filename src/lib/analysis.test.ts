import { describe, expect, it } from "vitest";

import {
  dailyActivity,
  mannWhitney,
  median,
  retention,
  signTest,
  toCsv,
  withinDates,
  withoutOutliers,
  type StudyParticipant,
} from "./analysis";

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

  it("counts a participant as retained up to their last active day", () => {
    const now = new Date(joined.getTime() + 3.5 * 86_400_000); // day 4
    const chart = retention(
      [participant("a1", "A", joined, [1, 3]), participant("a2", "A", joined, []), participant("b1", "B", joined, [4])],
      now,
    );
    expect(chart.A.slice(0, 5)).toEqual([0.5, 0.5, 0.5, 0, null]);
    expect(chart.B.slice(0, 4)).toEqual([1, 1, 1, 1]);
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

describe("toCsv", () => {
  it("writes a header and quotes only cells that need it", () => {
    expect(toCsv([{ a: 1, b: 'say "hi", ok' }, { a: 2, b: "" }])).toBe('a,b\r\n1,"say ""hi"", ok"\r\n2,');
  });
});

describe("withoutOutliers", () => {
  const spender = (studyId: string, group: "A" | "B", coins: number, visits = 1): StudyParticipant => ({
    id: studyId,
    studyId,
    group,
    joinedAt: new Date("2026-09-01T00:00:00Z"),
    coinsEarned: 0,
    taskCompletions: [],
    events: [
      ...Array.from({ length: visits }, () => ({ type: "STORE_VISIT", at: new Date(), coins: 0, items: 0, durationMs: 0 })),
      { type: "ITEM_PURCHASED", at: new Date(), coins, items: 1, durationMs: 0 },
    ] as StudyParticipant["events"],
  });

  it("drops a participant past Q3 + 1.5·IQR within their own group", () => {
    // A: 10, 20, 30, 40, 1000 → Q1 20, Q3 40, upper fence 70.
    const a = [10, 20, 30, 40, 1000].map((c, i) => spender(`A${i}`, "A", c));
    // B spends far more across the board — judged on its own, nobody stands out.
    const b = [900, 1000, 1100, 1200].map((c, i) => spender(`B${i}`, "B", c));
    const { kept, outliers } = withoutOutliers([...a, ...b]);
    expect(outliers).toEqual([{ studyId: "A4", group: "A", on: ["coins spent"] }]);
    expect(kept).toHaveLength(8);
  });

  it("flags no one on a metric whose IQR is 0", () => {
    // Every item count is 1 and every visit count 1; only coins vary and stay in range.
    const all = [5, 5, 5, 5, 6].map((c, i) => spender(`P${i}`, "A", c));
    expect(withoutOutliers(all).outliers).toEqual([]);
  });
});

describe("withinDates", () => {
  const day = (d: number) => new Date(`2026-09-${String(d).padStart(2, "0")}T12:00:00Z`);
  const person = (joined: number, active: number[]): StudyParticipant => ({
    id: `P${joined}`,
    studyId: `P${joined}`,
    group: "A",
    joinedAt: day(joined),
    coinsEarned: 50,
    taskCompletions: active.map(day),
    events: active.map((d) => ({ type: "STORE_VISIT", at: day(d), coins: 0, items: 0, durationMs: 0 })) as StudyParticipant["events"],
  });

  it("keeps only activity in [from, to) and drops anyone who joined after it", () => {
    const [kept, ...rest] = withinDates([person(1, [1, 3, 5, 7]), person(9, [9])], day(3), day(7));
    expect(rest).toEqual([]);
    expect(kept.events.map((e) => e.at)).toEqual([day(3), day(5)]);
    expect(kept.taskCompletions).toEqual([day(3), day(5)]);
    expect(kept.coinsEarned).toBe(50);
  });

  it("treats a null end as open", () => {
    expect(withinDates([person(1, [1, 3])], null, null)[0].events).toHaveLength(2);
    expect(withinDates([person(1, [1, 3])], day(2), null)[0].events).toHaveLength(1);
  });
});

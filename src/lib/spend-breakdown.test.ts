import { describe, expect, it } from "vitest";

import { spendByDay, spendByWeek } from "@/lib/spend-breakdown";

/**
 * #278 — the purchase history footer's all-time total opens into a weekly
 * and daily breakdown. These are the two aggregations behind it.
 *
 * Both bucket on `calendarDaysBetween`, so "a week" is a rolling 7-day
 * window rather than a calendar week — the same span the footer's previous
 * "spent this week" already meant.
 */
const NOW = new Date("2026-09-11T12:00:00Z");

/** `daysAgo` days before NOW, at a time of day that cannot drift across a boundary. */
function spend(daysAgo: number, coins: number) {
  const purchasedAt = new Date(NOW);
  purchasedAt.setDate(purchasedAt.getDate() - daysAgo);
  return { purchasedAt, coinSpent: coins };
}

describe("spendByWeek", () => {
  it("buckets into rolling 7-day windows, newest first", () => {
    const buckets = spendByWeek(
      [spend(0, 100), spend(6, 50), spend(7, 30), spend(14, 10)],
      NOW,
    );

    expect(buckets).toEqual([
      // Day 0 and day 6 are the same window — 7 days, not a calendar week.
      { label: "This week", coins: 150 },
      { label: "Last week", coins: 30 },
      { label: "2 weeks ago", coins: 10 },
    ]);
  });

  it("omits windows with no purchases rather than listing empty rows", () => {
    const buckets = spendByWeek([spend(0, 100), spend(21, 40)], NOW);

    expect(buckets.map((b) => b.label)).toEqual(["This week", "3 weeks ago"]);
  });

  it("is empty for someone who has never bought anything", () => {
    expect(spendByWeek([], NOW)).toEqual([]);
  });
});

describe("spendByDay", () => {
  it("returns one bucket per day, keeping the quiet ones", () => {
    const buckets = spendByDay([spend(0, 25), spend(2, 60)], NOW);

    expect(buckets).toHaveLength(7);
    expect(buckets[0]).toEqual({ label: "Today", coins: 25 });
    expect(buckets[1]).toEqual({ label: "Yesterday", coins: 0 });
    expect(buckets[2].coins).toBe(60);
    // A run of zeroes is the shape of a quiet week, not noise to drop.
    expect(buckets.slice(3).every((b) => b.coins === 0)).toBe(true);
  });

  it("names days beyond yesterday by weekday", () => {
    const [, , third] = spendByDay([], NOW);
    expect(third.label).toMatch(/^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day$/);
  });

  it("ignores anything older than the window it advertises", () => {
    const buckets = spendByDay([spend(7, 999), spend(30, 999)], NOW);

    expect(buckets.every((b) => b.coins === 0)).toBe(true);
  });
});

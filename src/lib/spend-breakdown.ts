import { calendarDaysBetween } from "@/lib/day";

/**
 * #278 — the aggregations behind the purchase history footer's breakdown.
 *
 * Their own module rather than `checkout.ts`: these are pure functions over
 * a list, with no database access, and `checkout.ts` reaches next-auth
 * through its import chain — which makes it unloadable in the unit test
 * environment and would have left this logic untestable.
 */
/** One bucket of the #278 spend breakdown — a label and what was spent in it. */
export type SpendBucket = { label: string; coins: number };

/** The minimum a transaction needs for {@link spendByWeek}/{@link spendByDay} to bucket it. */
type SpentAt = { purchasedAt: Date; coinSpent: number };

/**
 * #278 — spend per rolling 7-day window, most recent first.
 *
 * Rolling rather than calendar weeks, deliberately: the history footer's
 * "spent this week" already meant "the last 7 days"
 * (`calendarDaysBetween(...) < 7`), so calendar weeks here would have made
 * the same page use one phrase for two different spans. It also sidesteps
 * picking a week-start day, which no requirement states.
 *
 * Only windows that actually contain a purchase are returned — a study
 * participant with a quiet fortnight should not scroll past two empty rows
 * to reach the week they are looking for.
 */
export function spendByWeek(transactions: SpentAt[], now: Date): SpendBucket[] {
  const totals = new Map<number, number>();
  for (const entry of transactions) {
    const week = Math.floor(calendarDaysBetween(entry.purchasedAt, now) / 7);
    totals.set(week, (totals.get(week) ?? 0) + entry.coinSpent);
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, coins]) => ({
      label:
        week === 0
          ? "This week"
          : week === 1
            ? "Last week"
            : `${week} weeks ago`,
      coins,
    }));
}

/**
 * #278 — spend per day across the last `days`, most recent first.
 *
 * Bounded rather than unbounded, and the heading above it says so, because
 * every individual purchase is already listed day by day up the page; this
 * is the at-a-glance shape of recent spending, not a second copy of the
 * log. Empty days are kept here (unlike {@link spendByWeek}) — a run of
 * zeroes across a week *is* the shape, and dropping them would make a
 * quiet week look like a busy one with fewer bars.
 */
export function spendByDay(
  transactions: SpentAt[],
  now: Date,
  days = 7,
): SpendBucket[] {
  const totals = new Array<number>(days).fill(0);
  for (const entry of transactions) {
    const ago = calendarDaysBetween(entry.purchasedAt, now);
    if (ago >= 0 && ago < days) totals[ago] += entry.coinSpent;
  }

  return totals.map((coins, ago) => ({
    label:
      ago === 0
        ? "Today"
        : ago === 1
          ? "Yesterday"
          : new Date(now.getTime() - ago * 86_400_000).toLocaleDateString(
              "en-US",
              {
                weekday: "long",
              },
            ),
    coins,
  }));
}

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Every write of a `TelemetryEvent` (STOR-18, NFR-STORE-1).
 *
 * Same rule as `src/lib/tasks.ts`/`src/lib/store.ts`: nothing outside this
 * module touches `prisma.telemetryEvent` — including `checkout.ts`'s own
 * `ITEM_PURCHASED` logging (STOR-16), which now calls through here too
 * rather than writing the table directly, so STOR-18's event types stay
 * defined in one place.
 *
 * SERVER ONLY — imports Prisma.
 */

/**
 * The event types `TelemetryEvent.eventType` actually gets, per NFR-STORE-1,
 * STOR-18's own bullet and ADM-10 (`SESSION_START`/`SESSION_END`/
 * `STORE_TIME_ON_PAGE`). Not a schema enum — `TelemetryEvent` deliberately
 * keeps `eventType` as a free string (see the model's own doc comment) for
 * future event types without a migration — but every *current* writer is
 * expected to pick from this set rather than inventing a string.
 */
export type TelemetryEventType =
  | "STORE_VISIT"
  | "ITEM_VIEWED"
  | "ITEM_PURCHASED"
  | "ADD_TO_CART"
  | "SESSION_START"
  | "SESSION_END"
  | "STORE_TIME_ON_PAGE";

/**
 * Logs one event. Takes a plain `PrismaClient` by default, but accepts a
 * `Prisma.TransactionClient` too — `checkout.ts`'s `ITEM_PURCHASED` events
 * need to land inside its own `$transaction` (the log has to commit or roll
 * back with the purchase it describes), while STOR-10/11's `STORE_VISIT`/
 * `ITEM_VIEWED` are standalone reads with nothing to be transactional with.
 */
export async function logTelemetryEvent(
  userId: string,
  eventType: TelemetryEventType,
  payload: Prisma.InputJsonValue,
  client: Pick<typeof prisma, "telemetryEvent"> = prisma,
): Promise<void> {
  await client.telemetryEvent.create({ data: { userId, eventType, payload } });
}

/** ADM-06/07 — `SESSION_START`/`SESSION_END` paired by `sessionId`, plus the
 * derived metrics the admin dashboard's tables actually need. */
export type SessionMetrics = {
  sessionCount: number;
  totalTimeInAppMs: number;
  daysReturning: number;
};

/**
 * Pairs each `SESSION_START` with the `SESSION_END` that shares its
 * `sessionId` (`session-tracker.tsx`'s `sendBeacon` on `pagehide`) to derive
 * "session count", "total time in app" and "days returning" for ADM-02/07.
 *
 * A start with no matching end — the tab crashed, or `sendBeacon` never
 * fired — still counts toward `sessionCount` and `daysReturning`, but
 * contributes 0 toward `totalTimeInAppMs` rather than guessing a duration:
 * an undercount is honest, a fabricated one isn't.
 */
export async function sessionMetricsForUser(userId: string): Promise<SessionMetrics> {
  const events = await prisma.telemetryEvent.findMany({
    where: { userId, eventType: { in: ["SESSION_START", "SESSION_END"] } },
    orderBy: { createdAt: "asc" },
  });

  const starts = new Map<string, Date>();
  const ends = new Map<string, Date>();
  const days = new Set<string>();

  for (const event of events) {
    const sessionId = (event.payload as { sessionId?: unknown })?.sessionId;
    if (typeof sessionId !== "string") continue;

    if (event.eventType === "SESSION_START") {
      // First start wins if the same id somehow logs twice — matches the
      // tracker's own "only the first mount in a tab logs a start" rule.
      if (!starts.has(sessionId)) starts.set(sessionId, event.createdAt);
      days.add(event.createdAt.toISOString().slice(0, 10));
    } else {
      ends.set(sessionId, event.createdAt);
    }
  }

  let totalTimeInAppMs = 0;
  for (const [sessionId, startedAt] of starts) {
    const endedAt = ends.get(sessionId);
    if (endedAt) totalTimeInAppMs += Math.max(0, endedAt.getTime() - startedAt.getTime());
  }

  return { sessionCount: starts.size, totalTimeInAppMs, daysReturning: days.size };
}

/** ADM-03/07 — the store engagement funnel: visits → viewed → purchased. */
export type StoreFunnelMetrics = {
  storeVisits: number;
  itemsViewed: number;
  itemsAddedToCart: number;
  avgTimeOnStorePageMs: number;
};

/**
 * `STORE_VISIT`/`ITEM_VIEWED`/`ADD_TO_CART` counts plus the mean
 * `STORE_TIME_ON_PAGE` duration. Deliberately doesn't include "items
 * purchased" — that comes from `checkout.ts`'s `purchaseCount()` against the
 * real `Transaction` table, the authoritative record of what was actually
 * bought, rather than this module's `ITEM_PURCHASED` log of the same fact.
 */
export async function storeFunnelForUser(userId: string): Promise<StoreFunnelMetrics> {
  const [storeVisits, itemsViewed, itemsAddedToCart, timeEvents] = await Promise.all([
    prisma.telemetryEvent.count({ where: { userId, eventType: "STORE_VISIT" } }),
    prisma.telemetryEvent.count({ where: { userId, eventType: "ITEM_VIEWED" } }),
    prisma.telemetryEvent.count({ where: { userId, eventType: "ADD_TO_CART" } }),
    prisma.telemetryEvent.findMany({
      where: { userId, eventType: "STORE_TIME_ON_PAGE" },
      select: { payload: true },
    }),
  ]);

  const durations = timeEvents
    .map((event) => (event.payload as { durationMs?: unknown })?.durationMs)
    .filter((value): value is number => typeof value === "number");

  const avgTimeOnStorePageMs =
    durations.length === 0
      ? 0
      : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);

  return { storeVisits, itemsViewed, itemsAddedToCart, avgTimeOnStorePageMs };
}

/** ADM-07 — one entry per day, oldest first, for the "return pattern" sparkline. */
export type DailyActivity = { date: string; count: number };

/**
 * Every telemetry event of any type counts as "activity" for this chart —
 * it's a return-pattern shape, not a specific funnel, so a day with only a
 * session (no store visit) still counts as a day the participant showed up.
 */
export async function dailyActivityForUser(
  userId: string,
  days = 14,
): Promise<DailyActivity[]> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const events = await prisma.telemetryEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const counts = new Map<string, number>();
  for (const event of events) {
    const day = event.createdAt.toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: counts.get(key) ?? 0 };
  });
}

/** ADM-08 — every `TelemetryEvent` row that exists, across every user. */
export async function totalTelemetryEventCount(): Promise<number> {
  return prisma.telemetryEvent.count();
}

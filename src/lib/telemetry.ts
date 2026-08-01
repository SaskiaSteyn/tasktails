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
 * The three event types `TelemetryEvent.eventType` actually gets, per
 * NFR-STORE-1 and STOR-18's own bullet. Not a schema enum — `TelemetryEvent`
 * deliberately keeps `eventType` as a free string (see the model's own doc
 * comment) for future event types without a migration — but every *current*
 * writer is expected to pick from this set rather than inventing a string.
 */
export type TelemetryEventType = "STORE_VISIT" | "ITEM_VIEWED" | "ITEM_PURCHASED";

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

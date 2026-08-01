import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { storeItemsForUser } from "@/lib/store";
import { logTelemetryEvent } from "@/lib/telemetry";

/**
 * STOR-10 — `GET /api/store/items`. Lists the full store catalogue, each
 * item annotated with `locked` against the signed-in user's current level
 * (STOR-04's card needs both the locked and unlocked items to render).
 *
 * Same auth pattern as src/app/api/tasks/route.ts: checked here explicitly
 * rather than relied on from src/proxy.ts, which is a redirect for page
 * navigations, not the authorisation boundary for API routes.
 *
 * STOR-18/NFR-STORE-1 — logs `STORE_VISIT`. This route is the backend proxy
 * for "opened the store": it's what STOR-01's listing page fetches on load,
 * and there's no separate page-view signal to hang the event off instead
 * with the frontend still To Do. Logged after the read succeeds, not before
 * — a failed auth check never reaches here to log a visit that didn't happen.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const items = await storeItemsForUser(userId);
  await logTelemetryEvent(userId, "STORE_VISIT", {});
  return NextResponse.json({ items });
}

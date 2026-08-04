import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logTelemetryEvent } from "@/lib/telemetry";

/**
 * ADM-10 — `POST /api/telemetry/store-time`. "Record time-on-page for store
 * pages", logged by `StoreTimeTracker` (`src/components/telemetry/
 * store-time-tracker.tsx`) once per store-page visit, on whichever comes
 * first: the tab going away (`pagehide`) or the component unmounting (an
 * in-app navigation elsewhere, which never fires `pagehide`).
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const durationMs = body?.durationMs;
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) {
    return NextResponse.json({ error: "durationMs must be a non-negative number." }, { status: 400 });
  }

  await logTelemetryEvent(userId, "STORE_TIME_ON_PAGE", { durationMs });
  return NextResponse.json({ ok: true });
}

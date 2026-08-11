import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logTelemetryEvent } from "@/lib/telemetry";

/**
 * ADM-10 — `POST /api/telemetry/session-end`.
 *
 * Called by `SessionTracker` via `navigator.sendBeacon` on `pagehide` — the
 * tab closing, refreshing, or navigating off-origin. A beacon request never
 * reads its response, so there is nothing here for the caller to act on;
 * this still returns the usual shape for consistency and so it's testable
 * with a normal fetch.
 *
 * `sendBeacon`'s body arrives as a `Blob`, not JSON headers the browser
 * guarantees — `request.json()` still parses it fine since the tracker sets
 * the blob's MIME type to `application/json`, but errors are swallowed
 * rather than surfaced, since nothing is listening for them.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sessionId = body && typeof body.sessionId === "string" ? body.sessionId : null;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  await logTelemetryEvent(userId, "SESSION_END", { sessionId });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logTelemetryEvent } from "@/lib/telemetry";

/**
 * ADM-10 — `POST /api/telemetry/session-start`.
 *
 * Called once per browser tab by `SessionTracker` (`src/components/telemetry/
 * session-tracker.tsx`), the first time it mounts with no `sessionId` yet in
 * `sessionStorage`. Same auth pattern as every other route: checked here
 * explicitly rather than relied on from `src/proxy.ts`.
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

  await logTelemetryEvent(userId, "SESSION_START", { sessionId });
  return NextResponse.json({ ok: true });
}

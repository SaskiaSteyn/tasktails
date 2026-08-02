import { NextResponse } from "next/server";

import { participantSummaries, requireAdmin } from "@/lib/admin";

/**
 * ADM-06 — `GET /api/admin/users`. Lists every participant with their
 * aggregated telemetry (ADM-02/03/04's tables read this one response).
 *
 * `requireAdmin()` is ADM-09's gate — 401 signed-out, 403 for a signed-in
 * non-admin, same auth-checked-here-explicitly shape every other route uses.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const participants = await participantSummaries();
  return NextResponse.json({ participants });
}

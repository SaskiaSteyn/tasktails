import { NextResponse } from "next/server";

import { participantTelemetryDetail, requireAdmin } from "@/lib/admin";

/**
 * ADM-07 — `GET /api/admin/users/[id]/telemetry`. One participant's detail
 * card (ADM-01's second card design): stat grid, store funnel and 14-day
 * return-pattern sparkline.
 *
 * 404 for an id that isn't a participant — an unknown id and the admin's own
 * account both hit this the same way, via `participantTelemetryDetail()`
 * returning null, same "don't leak which case it was" shape `updateTask()`
 * uses for ownership mismatches.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { id } = await params;
  const detail = await participantTelemetryDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  return NextResponse.json({ participant: detail });
}

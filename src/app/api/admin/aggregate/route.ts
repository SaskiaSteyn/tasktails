import { NextResponse } from "next/server";

import { requireAdmin, studyAggregate } from "@/lib/admin";

/**
 * ADM-08 — `GET /api/admin/aggregate`. Study-wide totals plus the Group A
 * vs Group B comparison ADM-05's overview card renders.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const aggregate = await studyAggregate();
  return NextResponse.json({ aggregate });
}

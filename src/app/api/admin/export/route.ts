import { NextResponse } from "next/server";

import { requireAdmin, studyDataset } from "@/lib/admin";
import { exportRows, toCsv } from "@/lib/analysis";

/**
 * #329 — `GET /api/admin/export`: every participant as one CSV row, for
 * analysis in free tools (JASP, R, pandas) and for joining the questionnaire
 * data on `study_id`. Same `requireAdmin()` gate as every `/api/admin/*` route.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(exportRows(await studyDataset())), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tasktails-participants-${date}.csv"`,
    },
  });
}

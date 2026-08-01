import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { storeItemForUser } from "@/lib/store";
import { logTelemetryEvent } from "@/lib/telemetry";

/**
 * STOR-11 — `GET /api/store/items/[id]`. Single item detail, `locked`
 * resolved against the signed-in user's level exactly as STOR-10's list does.
 *
 * 404 rather than any ownership distinction: store items aren't user-owned,
 * so an id either exists or it doesn't.
 *
 * STOR-18/NFR-STORE-1 — logs `ITEM_VIEWED`, but only once `item` is known to
 * exist: a 404 isn't a view of anything, so an unknown id logs nothing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const item = await storeItemForUser(userId, id);

  if (!item) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  await logTelemetryEvent(userId, "ITEM_VIEWED", {
    storeItemId: item.id,
    name: item.name,
  });

  return NextResponse.json({ item });
}

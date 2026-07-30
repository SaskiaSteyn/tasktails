import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { storeItemForUser } from "@/lib/store";

/**
 * STOR-11 — `GET /api/store/items/[id]`. Single item detail, `locked`
 * resolved against the signed-in user's level exactly as STOR-10's list does.
 *
 * 404 rather than any ownership distinction: store items aren't user-owned,
 * so an id either exists or it doesn't.
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

  return NextResponse.json({ item });
}

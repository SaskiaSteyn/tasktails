import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { storeItemsForUser } from "@/lib/store";

/**
 * STOR-10 — `GET /api/store/items`. Lists the full store catalogue, each
 * item annotated with `locked` against the signed-in user's current level
 * (STOR-04's card needs both the locked and unlocked items to render).
 *
 * Same auth pattern as src/app/api/tasks/route.ts: checked here explicitly
 * rather than relied on from src/proxy.ts, which is a redirect for page
 * navigations, not the authorisation boundary for API routes.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const items = await storeItemsForUser(userId);
  return NextResponse.json({ items });
}

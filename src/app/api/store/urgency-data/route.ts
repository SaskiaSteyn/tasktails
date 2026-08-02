import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { storeItemsForUser } from "@/lib/store";
import { groupGatedData } from "@/lib/study-group";
import { urgencyDataForItems } from "@/lib/urgency";

/**
 * URG-08 — `GET /api/store/urgency-data`. Fabricated Group B urgency values,
 * one row per catalogue item.
 *
 * Same auth pattern as STOR-10 (`/api/store/items`): 401 when signed out,
 * checked here rather than relied on from `src/proxy.ts`. Group isolation
 * goes through `groupGatedData()` (INF-17) rather than `currentStudyGroup()`
 * directly — a Group A user gets `{ items: [] }`, not an error, matching the
 * ticket's "returns empty/null for Group A" and `groupGatedData`'s own
 * contract of never blocking the request itself.
 *
 * Reuses `storeItemsForUser()` for the item id list rather than adding a new
 * Prisma query — `src/lib/store.ts` is the only module allowed to touch
 * `prisma.storeItem`, and the catalogue is small enough that the extra read
 * costs nothing worth avoiding.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const items = await groupGatedData(async () => {
    const storeItems = await storeItemsForUser(userId);
    return urgencyDataForItems(
      userId,
      storeItems.map((item) => item.id),
    );
  });

  return NextResponse.json({ items: items ?? [] });
}

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { snapshotOf } from "@/lib/economy";
import { sellOwnedItem } from "@/lib/sell";

/**
 * GACHA-07 — sells one owned item (or, for an animal, the pet itself — see
 * `sell.ts`'s doc comment). 404s rather than 403 when `id` isn't the
 * caller's, matching `/api/tasks/[id]`'s "can't confirm the id was ever
 * real" reasoning — same shape whether it doesn't exist, belongs to someone
 * else, or (a goods item) is already at zero quantity.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const result = await sellOwnedItem(userId, id);

  if (!result.ok) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  return NextResponse.json({
    refund: result.refund,
    item: result.item,
    economy: snapshotOf(result.economy),
  });
}

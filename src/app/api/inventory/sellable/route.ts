import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { sellableItemsForUser } from "@/lib/sell";

/**
 * GACHA-08 — everything `GACHA-17`'s Sell Items screen lists: every item the
 * signed-in user owns, goods and pets together, each with its `sellValue`
 * already computed so the client never has to reimplement `GACHA-07`'s 70%
 * arithmetic.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const items = await sellableItemsForUser(userId);
  return NextResponse.json({ items });
}

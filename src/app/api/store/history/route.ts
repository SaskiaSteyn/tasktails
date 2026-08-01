import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { transactionsForUser } from "@/lib/checkout";

/**
 * STOR-17 — `GET /api/store/history`. Lists the signed-in user's purchase
 * transactions, newest first, each with its `storeItem` attached
 * (`transactionsForUser()`).
 *
 * Same auth pattern as `GET /api/store/cart`.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const transactions = await transactionsForUser(userId);
  return NextResponse.json({ transactions });
}

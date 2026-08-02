import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { lifetimeStatsFor } from "@/lib/stats";

/**
 * PRO-05 — `GET /api/user/stats`. The Profile page itself reads
 * `lifetimeStatsFor()` directly (it's already a server component fetching
 * the account and economy the same way), so this route is for any client-side
 * consumer that isn't a server render — same reasoning as ECO-06's `GET`.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.json(await lifetimeStatsFor(userId));
}

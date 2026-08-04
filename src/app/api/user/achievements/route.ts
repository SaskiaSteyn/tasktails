import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { achievementsForUser } from "@/lib/achievements";

/**
 * PRO-08 — `GET /api/user/achievements`. The Profile page itself reads
 * `achievementsForUser()` directly (same reasoning as PRO-05's stats route:
 * it's already a server component), so this is for any client-side
 * consumer that isn't a server render.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.json({
    achievements: await achievementsForUser(userId),
  });
}

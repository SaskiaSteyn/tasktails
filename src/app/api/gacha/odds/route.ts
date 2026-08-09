import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { RARITY_ODDS } from "@/lib/gacha";

/**
 * GACHA-06 — the published rarity odds for the Drop Rates screen (GACHA-16),
 * reached only via the info icon on Lucky Box home (GACHA-12).
 *
 * Deliberately the *only* thing this returns. `RARITY_ODDS` is the same
 * object `pullLuckyBox()` rolls against, so this can never drift from what a
 * pull actually does — but `HARD_PITY_THRESHOLD` and `pullsSinceLegendary`
 * are not imported here at all, not just left out of the response shape:
 * the design board is explicit that pity has no meter, counter, or rules
 * copy anywhere in the UI, so there is nothing pity-related for this route
 * to leak even by accident.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.json({ odds: RARITY_ODDS });
}

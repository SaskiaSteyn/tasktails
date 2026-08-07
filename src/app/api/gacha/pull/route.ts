import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { snapshotOf } from "@/lib/economy";
import { LUCKY_BOX_COST_COINS, pullLuckyBox } from "@/lib/gacha";

/**
 * GACHA-04 — opens one Lucky Box.
 *
 * `POST` only, and the price is not in the body — same reasoning
 * `/api/economy/buy-xp` documents for itself: the cost is fixed by the
 * economy, not the client, and the account comes from the session so a
 * participant can't spend someone else's coins.
 *
 * Returns the pulled item (with `aboveLevel` — the design board's "locked"
 * reveal state, per GACHA-14's reveal screen), the adopted pet if the pull
 * was an animal, and the fresh economy snapshot so the persistent header
 * updates from this response rather than a second round trip.
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const result = await pullLuckyBox(userId);

  if (!result.ok) {
    if (result.reason === "no-account") {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (result.reason === "empty-catalogue") {
      return NextResponse.json(
        { error: `No ${result.rarity.toLowerCase()} items exist to pull yet.` },
        { status: 409 },
      );
    }

    // 409 rather than 402 — same reasoning buy-xp's route documents: the
    // request is well-formed, it just conflicts with the balance held right
    // now, and 402 is reserved for real payment flows.
    return NextResponse.json(
      {
        error: `Not enough coins — ${LUCKY_BOX_COST_COINS} needed.`,
        code: result.reason,
        coins: result.coins,
        shortfall: result.shortfall,
        cost: LUCKY_BOX_COST_COINS,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    spent: result.spent,
    item: result.item,
    pet: result.pet,
    economy: snapshotOf(result.economy),
  });
}

/** What the pull costs, so the Lucky Box store card (GACHA-10) never hard-codes it. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.json({ cost: LUCKY_BOX_COST_COINS });
}

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buyXp, snapshotOf } from "@/lib/economy";
import { BUY_XP_COST_COINS, BUY_XP_GAIN_XP } from "@/lib/rewards";

/**
 * Coin → XP conversion (ECO-06, §3.1) — 100 coins buys 40 XP.
 *
 * `POST` only, and the price is not in the body: the amounts are fixed by the
 * economy, so a client that could name its own cost could name zero. The
 * account comes from the session for the same reason — a participant must not
 * be able to spend someone else's coins by putting their id in a request.
 *
 * Returns the fresh economy snapshot so the persistent header (INF-12) can be
 * updated from the response rather than needing a second round trip, and the
 * level-up event so PRO-06's card can raise ECO-07's toast.
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const result = await buyXp(userId);

  if (!result.ok) {
    if (result.reason === "no-account") {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    // 409 rather than 402: the request is well-formed and the participant is
    // entitled to make it, it just conflicts with the balance they hold right
    // now. 402 is reserved for real payment flows, and this is game currency.
    return NextResponse.json(
      {
        error: `Not enough coins — ${BUY_XP_COST_COINS} needed.`,
        code: result.reason,
        coins: result.coins,
        shortfall: result.shortfall,
        cost: BUY_XP_COST_COINS,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    spent: result.spent,
    gained: result.gained,
    levelUp: result.levelUp,
    economy: snapshotOf(result.economy),
  });
}

/** What the conversion costs, so PRO-06's card never hard-codes the numbers. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  return NextResponse.json({
    cost: BUY_XP_COST_COINS,
    gain: BUY_XP_GAIN_XP,
  });
}

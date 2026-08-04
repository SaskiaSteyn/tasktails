import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { checkout } from "@/lib/checkout";
import { snapshotOf } from "@/lib/economy";

/**
 * STOR-16 — `POST /api/store/checkout`. Buys everything in the signed-in
 * user's cart via `checkout()`. No request body — the cart itself is the
 * order, same as `POST /api/economy/buy-xp` takes no body because the
 * amounts aren't caller-supplied.
 *
 * Status codes follow `buy-xp`'s convention: 404 for a missing account, 409
 * for a well-formed request that just can't be afforded right now
 * (`insufficient-coins`). `empty-cart` and `locked` are new here — 400 for
 * the former (nothing to check out), 403 for the latter (same reasoning as
 * `POST /api/store/cart`'s 403: the request is fine, the account isn't
 * entitled to it at this level).
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const result = await checkout(userId);

  if (!result.ok) {
    switch (result.reason) {
      case "empty-cart":
        return NextResponse.json(
          { error: "Cart is empty.", code: result.reason },
          { status: 400 },
        );
      case "no-account":
        return NextResponse.json(
          { error: "Account not found." },
          { status: 404 },
        );
      case "locked":
        return NextResponse.json(
          {
            error: "Some items in your cart require a higher level.",
            code: result.reason,
            items: result.items,
          },
          { status: 403 },
        );
      case "insufficient-coins":
        return NextResponse.json(
          {
            error: "Not enough coins to check out.",
            code: result.reason,
            coins: result.coins,
            shortfall: result.shortfall,
          },
          { status: 409 },
        );
    }
  }

  // PRO-09 — one of the three trigger points (task completion, purchase, pet
  // interaction); see `evaluateAchievements()`'s doc comment.
  const achievementsUnlocked = await evaluateAchievements(userId);

  return NextResponse.json({
    spent: result.spent,
    purchased: result.purchased,
    transactions: result.transactions,
    pets: result.pets,
    economy: snapshotOf(result.economy),
    achievementsUnlocked,
  });
}

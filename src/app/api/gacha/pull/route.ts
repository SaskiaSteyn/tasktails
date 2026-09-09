import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { economyForUser, snapshotOf } from "@/lib/economy";
import { LUCKY_BOX_COST_COINS, pullLuckyBox } from "@/lib/gacha";

/**
 * GACHA-04 — opens one Lucky Box.
 *
 * `POST` only, and the price is not in the body — same reasoning
 * `/api/economy/buy-xp` documents for itself: the cost is fixed by the
 * economy, not the client, and the account comes from the session so a
 * participant can't spend someone else's coins.
 *
 * Returns the pulled item (with `locked` — the design board's "Added,
 * locked — unlocks at Lvl N" reveal state, per GACHA-14's reveal screen),
 * the adopted pet if the pull was an animal, and the fresh economy snapshot
 * so the persistent header updates from this response rather than a second
 * round trip.
 *
 * **#259 — this route was missing `evaluateAchievements()`.** A pull is one
 * of exactly two ways to come to own something (the other is `checkout()`,
 * which has always called it), so every ownership criterion —
 * `RARITY_OWNED`, `CATEGORY_FULLY_OWNED`, `ALL_ITEMS_OWNED`,
 * `ANIMAL_VARIETY_OWNED` — sat unevaluated until the participant's next
 * task completion, purchase or pet interaction, whenever that happened to
 * be. Reported as "Krista got a chicken leg in her lucky box, and then only
 * once she interacted with the pet did it trigger": the badge was earned by
 * the pull and announced by the petting.
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

  const { unlocked: achievementsUnlocked, levelUp } =
    await evaluateAchievements(userId);

  // `result.economy` is `pullLuckyBox()`'s own snapshot, taken before
  // `evaluateAchievements()` could grant achievement XP on top of it — the
  // same staleness `/api/store/checkout` documents and re-reads for. Only
  // when something actually unlocked; a pull's own effect is coins, which
  // that snapshot already has right.
  const economy = achievementsUnlocked.length
    ? ((await economyForUser(userId)) ?? result.economy)
    : result.economy;

  return NextResponse.json({
    spent: result.spent,
    item: result.item,
    pet: result.pet,
    economy: snapshotOf(economy),
    achievementsUnlocked,
    levelUp,
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

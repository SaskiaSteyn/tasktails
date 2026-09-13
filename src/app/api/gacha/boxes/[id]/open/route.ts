import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { openLuckyBox } from "@/lib/gacha";

/**
 * Opens one owned box and returns its items in deal order. Idempotent — a
 * second call for the same box returns the same items and grants nothing
 * (`openLuckyBox()`).
 *
 * #259 — opening is how the ownership achievements are earned, so it
 * evaluates them, same as checkout. The reveal announces them once every
 * card is turned, so a badge can't spoil a card still face-down.
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
  const result = await openLuckyBox(userId, id);

  if (!result.ok) {
    if (result.reason === "empty-catalogue") {
      return NextResponse.json(
        { error: `No ${result.rarity.toLowerCase()} items exist to pull yet.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Box not found." }, { status: 404 });
  }

  const { unlocked: achievementsUnlocked, levelUp } =
    await evaluateAchievements(userId);

  return NextResponse.json({
    items: result.items,
    achievementsUnlocked,
    levelUp,
  });
}

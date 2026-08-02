import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { recordPetInteraction } from "@/lib/pets";

/**
 * PET-07 — `POST /api/pets/[id]/pet`. Records a "Pet" interaction
 * (PET-03's button) and returns the animal's updated stats.
 *
 * `recordPetInteraction()` (`src/lib/pets.ts`) does the real work: it
 * catches the pet's stored `happiness`/`hunger` up to their current decayed
 * values before applying the boost, so a pet that's been decaying for a
 * while doesn't get boosted from a stale, too-high stored number. See that
 * function's doc comment for the full reasoning.
 *
 * Same auth pattern as `src/app/api/tasks/[id]/complete/route.ts`: checked
 * here explicitly rather than relied on from `src/proxy.ts`. Not
 * forward-only — unlike task completion, petting has no "already done"
 * state, so there's no 409 case here, only 401/404.
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
  const pet = await recordPetInteraction(userId, id);
  if (!pet) {
    return NextResponse.json({ error: "Pet not found." }, { status: 404 });
  }

  // PRO-09 — one of the three trigger points (task completion, purchase, pet
  // interaction); see `evaluateAchievements()`'s doc comment.
  await evaluateAchievements(userId);

  return NextResponse.json({ pet });
}

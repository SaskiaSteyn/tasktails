import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { recordFeedInteraction } from "@/lib/pets";
import { fieldErrors } from "@/lib/validation/auth";
import { feedPetSchema } from "@/lib/validation/pets";

/**
 * PET-08 — `POST /api/pets/[id]/feed`. Records a "Feed" interaction
 * (PET-04's sheet): consumes one unit of the chosen food item and applies
 * its hunger/happiness deltas to the pet.
 *
 * `recordFeedInteraction()` (`src/lib/pets.ts`) does the real work and
 * reports back a three-way result — this route's only job is turning that
 * into the right HTTP response, same "auth → validate → delegate → map
 * result" shape `tasks/route.ts`'s `POST` uses.
 *
 * Both 404 cases ("Pet not found" / "Food item not found or out of stock")
 * share the same "can't tell the difference" reasoning every other lookup
 * in this app uses — a food item that's the wrong owner's, doesn't exist,
 * isn't food, or is already at 0 all read identically to the caller.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request body." },
      { status: 400 },
    );
  }

  const parsed = feedPetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await recordFeedInteraction(
    userId,
    id,
    parsed.data.inventoryItemId,
  );

  if (!result.ok) {
    const error =
      result.reason === "pet-not-found"
        ? "Pet not found."
        : "Food item not found or out of stock.";
    return NextResponse.json({ error }, { status: 404 });
  }

  // PRO-09 — one of the three trigger points (task completion, purchase, pet
  // interaction); see `evaluateAchievements()`'s doc comment.
  await evaluateAchievements(userId);

  return NextResponse.json({ pet: result.pet, item: result.item });
}

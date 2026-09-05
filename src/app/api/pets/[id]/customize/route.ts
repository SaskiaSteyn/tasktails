import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { evaluateAchievements } from "@/lib/achievements";
import { recordCustomizeInteraction, recordUnequipInteraction } from "@/lib/pets";
import { fieldErrors } from "@/lib/validation/auth";
import { customizePetSchema } from "@/lib/validation/pets";

/**
 * Shared by `POST`/`DELETE` below: auth, parse the identical
 * `{ inventoryItemId }` body, and 404-map a `CustomizeResult` the same way —
 * only what happens *between* those two steps (equip vs. unequip) differs.
 */
async function parseRequest(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) } as const;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json({ error: "Malformed request body." }, { status: 400 }),
    } as const;
  }

  const parsed = customizePetSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: NextResponse.json({ fieldErrors: fieldErrors(parsed.error) }, { status: 400 }),
    } as const;
  }

  return { userId, inventoryItemId: parsed.data.inventoryItemId } as const;
}

/**
 * PET-09 — `POST /api/pets/[id]/customize`. Records a "Customize"
 * interaction (PET-05's sheet): equips one accessory or decoration
 * (background) to a pet, displacing whatever it had on in that same
 * category before.
 *
 * `recordCustomizeInteraction()` (`src/lib/pets.ts`) does the real work and
 * reports back a two-way result — same "auth → validate → delegate → map
 * result" shape `feed/route.ts`'s `POST` uses, including its "can't tell
 * the difference" 404 messages (a bad pet id vs. a bad/unowned accessory
 * id).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseRequest(request);
  if ("error" in parsed) return parsed.error;

  const { id } = await params;
  const result = await recordCustomizeInteraction(parsed.userId, id, parsed.inventoryItemId);

  if (!result.ok) {
    // #215 — one pet at a time. The client already draws such items locked
    // with the owner's name; this covers a stale grid or a hand-made
    // request. 409, not 404: the request is well-formed and the item is
    // real, it's just spoken for — same "well-formed, not entitled right
    // now" reasoning `buy-xp`'s 409 documents.
    if (result.reason === "equipped-elsewhere") {
      return NextResponse.json(
        { error: "That item is on another pet — unequip it there first." },
        { status: 409 },
      );
    }
    const error = result.reason === "pet-not-found" ? "Pet not found." : "Item not found.";
    return NextResponse.json({ error }, { status: 404 });
  }

  // PRO-09 — one of the three trigger points (task completion, purchase, pet
  // interaction); see `evaluateAchievements()`'s doc comment. PRO-18:
  // `levelUp` is new here, same reasoning as the "pet"/"feed" routes.
  const { unlocked: achievementsUnlocked, levelUp } =
    await evaluateAchievements(parsed.userId);

  return NextResponse.json({ item: result.item, achievementsUnlocked, levelUp });
}

/**
 * The reverse of `POST`, at the user's request: tapping the already-equipped
 * tile again clears it instead of being a no-op. Same body shape, same 404
 * mapping, but delegates to `recordUnequipInteraction()` — and skips the
 * achievement/level-up evaluation `POST` does, since unequipping never newly
 * satisfies an ownership/wear criterion the way equipping can (see that
 * function's own doc comment).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseRequest(request);
  if ("error" in parsed) return parsed.error;

  const { id } = await params;
  const result = await recordUnequipInteraction(parsed.userId, id, parsed.inventoryItemId);

  if (!result.ok) {
    const error = result.reason === "pet-not-found" ? "Pet not found." : "Item not found.";
    return NextResponse.json({ error }, { status: 404 });
  }

  return NextResponse.json({ item: result.item });
}

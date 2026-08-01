import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { recordCustomizeInteraction } from "@/lib/pets";
import { fieldErrors } from "@/lib/validation/auth";
import { customizePetSchema } from "@/lib/validation/pets";

/**
 * PET-09 — `POST /api/pets/[id]/customize`. Records a "Customize"
 * interaction (PET-05's sheet): equips one accessory to a pet, displacing
 * whatever it had on before.
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

  const parsed = customizePetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await recordCustomizeInteraction(
    userId,
    id,
    parsed.data.inventoryItemId,
  );

  if (!result.ok) {
    const error =
      result.reason === "pet-not-found"
        ? "Pet not found."
        : "Accessory not found.";
    return NextResponse.json({ error }, { status: 404 });
  }

  return NextResponse.json({ item: result.item });
}

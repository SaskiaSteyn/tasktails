import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { renamePet } from "@/lib/pets";
import { fieldErrors } from "@/lib/validation/auth";
import { renamePetSchema } from "@/lib/validation/pets";

/**
 * `POST /api/pets/[id]/rename` — the customize screen's rename control.
 * Same "auth → validate → delegate → map result" shape `customize/route.ts`
 * uses; `renamePet()` (`src/lib/pets.ts`) does the real work and its
 * ownership check is the write itself, so a bad or unowned pet id just
 * reports 404 rather than needing a separate lookup first.
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

  const parsed = renamePetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { id } = await params;
  const pet = await renamePet(userId, id, parsed.data.name);
  if (!pet) {
    return NextResponse.json({ error: "Pet not found." }, { status: 404 });
  }

  return NextResponse.json({ pet });
}

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { decayedPetsForUser } from "@/lib/pets";

/**
 * PET-06 — `/api/pets`. Lists the authenticated user's animals with
 * `happiness`/`hunger` already decayed for `now` (`decayedPetsForUser()`
 * applies `decayedStateFor()` from `src/lib/pet-decay.ts` — see that module
 * for why decay is computed on every read rather than written back).
 *
 * PET-01's gallery/Sanctuary pages read `petsForUser()`/`petForUser()`
 * directly as server components and don't call this route — same "no
 * network hop needed" split `tasks/route.ts` documents for `tasksForUser()`.
 * This exists for whichever client-side consumer needs to re-fetch after a
 * mutation (PET-07/08/09, once built).
 *
 * Same auth pattern as `src/app/api/tasks/route.ts`: checked here explicitly
 * rather than relied on from `src/proxy.ts`.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const pets = await decayedPetsForUser(userId);
  return NextResponse.json({ pets });
}

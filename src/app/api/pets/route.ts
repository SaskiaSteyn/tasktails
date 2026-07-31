import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { petsForUser } from "@/lib/pets";

/**
 * PET-06 — `/api/pets`. Lists the authenticated user's animals with
 * `happiness`/`hunger` already decayed for `now` (`petsForUser()` applies
 * `decayedStateFor()` from `src/lib/pet-decay.ts` — see that module and
 * `petsForUser()`'s own comment for why decay is computed on every read,
 * everywhere a pet is read, rather than written back).
 *
 * PET-01's gallery/Sanctuary pages read `petsForUser()`/`petForUser()`
 * directly as server components and don't call this route — same "no
 * network hop needed" split `tasks/route.ts` documents for `tasksForUser()`.
 * This exists for whichever client-side consumer needs to re-fetch after a
 * mutation (PET-08/09, once built — PET-07's "Pet" button uses
 * `router.refresh()` instead, since it's already on a page that reads
 * `petForUser()` directly).
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

  const pets = await petsForUser(userId);
  return NextResponse.json({ pets });
}

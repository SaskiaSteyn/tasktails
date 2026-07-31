import type { Pet, StoreItem } from "@/generated/prisma/client";

import { decayedStateFor } from "@/lib/pet-decay";
import { prisma } from "@/lib/prisma";

/**
 * Every read of a pet (INF-08, PET-01/02). Nothing outside this module
 * touches `prisma.pet` — same rule as `src/lib/tasks.ts` and `src/lib/users.ts`.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { Pet };

/** A pet with the store item it was bought as — its species, name stem and art. */
export type PetWithItem = Pet & { storeItem: StoreItem };

/**
 * All of a user's animals, oldest-acquired first — cuid ids are k-sortable,
 * same ordering rationale `tasks.ts` uses for subtasks, and there's no
 * `createdAt` column on `Pet` to sort by instead.
 *
 * Returns the stats exactly as stored, undecayed — PET-01/02's gallery and
 * Sanctuary pages read this directly (server components, no network hop,
 * same pattern `tasks/route.ts` documents for `tasksForUser()`) and were
 * built and verified against static seed data. `decayedPetsForUser()` below
 * is the PET-06/PET-10 variant, kept separate rather than folded in here so
 * this ticket doesn't silently change what an already-shipped screen shows.
 */
export async function petsForUser(userId: string): Promise<PetWithItem[]> {
  return prisma.pet.findMany({
    where: { userId },
    orderBy: { id: "asc" },
    include: { storeItem: true },
  });
}

/**
 * A single animal, scoped to its owner — the Sanctuary detail screen
 * (`ADDENDUM-zoo-gallery.md`'s drill-in from the gallery). Returns null both
 * when the id doesn't exist and when it belongs to someone else, same
 * "can't tell the difference" reasoning `taskForUser()` documents — the
 * caller redirects either way rather than confirming the id was ever real.
 */
export async function petForUser(
  userId: string,
  petId: string,
): Promise<PetWithItem | null> {
  return prisma.pet.findFirst({
    where: { id: petId, userId },
    include: { storeItem: true },
  });
}

/**
 * PET-06/PET-10 — `petsForUser()` with `happiness`/`hunger` recomputed for
 * `now` via `decayedStateFor()` (`src/lib/pet-decay.ts`). The stored row is
 * untouched; decay is never written back, only read — PET-10's own ticket
 * text scopes the calculation to exactly this ("calculated on `GET
 * /api/pets`, no background job required"), which is the only caller today
 * (`src/app/api/pets/route.ts`).
 */
export async function decayedPetsForUser(
  userId: string,
  now: Date = new Date(),
): Promise<PetWithItem[]> {
  const pets = await petsForUser(userId);
  return pets.map((pet) => ({ ...pet, ...decayedStateFor(pet, now) }));
}

// PET-02's mood derivation (`PetMood`, `moodFor()`, `MOOD_COPY`) lives in
// `src/lib/pet-mood.ts` instead of here — it's pure, and `AnimalCard` (a
// client component) needs it without pulling this file's Prisma import (and
// therefore `pg`'s Node built-ins) into the browser bundle.

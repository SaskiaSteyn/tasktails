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
 * The undecorated read every public function here builds on — exactly what's
 * stored, no decay applied. Not exported: every *caller* needs the decayed
 * view (PET-06/PET-10), and the one place that genuinely needs the raw row
 * (`recordPetInteraction()`, to avoid decaying twice) fetches through here
 * directly rather than through the public, already-decayed `petForUser()`.
 */
function findPetRaw(userId: string, petId: string) {
  return prisma.pet.findFirst({
    where: { id: petId, userId },
    include: { storeItem: true },
  });
}

/**
 * All of a user's animals, oldest-acquired first — cuid ids are k-sortable,
 * same ordering rationale `tasks.ts` uses for subtasks, and there's no
 * `createdAt` column on `Pet` to sort by instead.
 *
 * `happiness`/`hunger` are recomputed for `now` via `decayedStateFor()`
 * (`src/lib/pet-decay.ts`, PET-06/PET-10) before returning — the stored row
 * itself is untouched, decay is never written back, only read. **Originally
 * left undecayed here** on the reasoning that PET-01/02's gallery/Sanctuary
 * pages were already shipped and verified against static seed data, and
 * this shouldn't change what they show as a side effect of a backend
 * ticket. That reasoning produced a worse bug in practice: those pages
 * would display a pet's stale, un-decayed numbers, then a single "Pet"
 * click (PET-07) would jump the displayed happiness/hunger straight to
 * their true decayed values in one step — indistinguishable on screen from
 * petting having *lowered* happiness and *raised* hunger, which is exactly
 * backwards from what the button does. Decaying on every read, including
 * here, means the displayed numbers are always already current, so an
 * interaction's effect (e.g. PET-07's +7 happiness) is visible as the only
 * change between before and after.
 */
export async function petsForUser(
  userId: string,
  now: Date = new Date(),
): Promise<PetWithItem[]> {
  const pets = await prisma.pet.findMany({
    where: { userId },
    orderBy: { id: "asc" },
    include: { storeItem: true },
  });
  return pets.map((pet) => ({ ...pet, ...decayedStateFor(pet, now) }));
}

/**
 * A single animal, scoped to its owner — the Sanctuary detail screen
 * (`ADDENDUM-zoo-gallery.md`'s drill-in from the gallery). Returns null both
 * when the id doesn't exist and when it belongs to someone else, same
 * "can't tell the difference" reasoning `taskForUser()` documents — the
 * caller redirects either way rather than confirming the id was ever real.
 *
 * Decayed for `now`, same as `petsForUser()` — see that function's comment.
 */
export async function petForUser(
  userId: string,
  petId: string,
  now: Date = new Date(),
): Promise<PetWithItem | null> {
  const pet = await findPetRaw(userId, petId);
  return pet ? { ...pet, ...decayedStateFor(pet, now) } : null;
}

/** PET-03's happiness boost from a single "Pet" interaction (README's mock: "Pet +7 happiness"). */
const PET_HAPPINESS_BOOST = 7;

/**
 * PET-07 — records a "Pet" interaction (PET-03's button). Reads the pet's
 * *raw* stored row (`findPetRaw()`, not the public `petForUser()` — that
 * would already be decayed, and decaying an already-decayed number a second
 * time from the same `lastInteractedAt` would double-count the elapsed
 * time), runs it through `decayedStateFor()` itself exactly once, then adds
 * the boost on top of that and persists the result with `lastInteractedAt`
 * reset to `now`. This catches the row up to whatever a participant
 * actually saw on screen before crediting the interaction — adding the
 * boost straight to a stale stored number would silently discard whatever
 * hunger/happiness had already decayed away since the last write, and
 * resetting `lastInteractedAt` without also writing the caught-up hunger
 * would restart hunger's own decay clock from its old, no-longer-true
 * value. `hunger` itself isn't touched by the interaction — it's written
 * back at its decayed value unchanged, per the design mock's "Pet +7
 * happiness" giving no hunger term.
 *
 * Not forward-only, per PET-03's own note — petting has no local "done"
 * state, so this always succeeds against a pet the caller owns, however
 * many times it's called. No `updateMany` completion guard is needed the
 * way `markTaskComplete()` uses one for that reason.
 *
 * Returns null when the pet doesn't exist or belongs to someone else, same
 * "can't tell the difference" shape `petForUser()` uses.
 */
export async function recordPetInteraction(
  userId: string,
  petId: string,
  now: Date = new Date(),
): Promise<PetWithItem | null> {
  const pet = await findPetRaw(userId, petId);
  if (!pet) return null;

  const decayed = decayedStateFor(pet, now);
  const happiness = Math.min(100, decayed.happiness + PET_HAPPINESS_BOOST);

  return prisma.pet.update({
    where: { id: petId },
    data: { happiness, hunger: decayed.hunger, lastInteractedAt: now },
    include: { storeItem: true },
  });
}

// PET-02's mood derivation (`PetMood`, `moodFor()`, `MOOD_COPY`) lives in
// `src/lib/pet-mood.ts` instead of here — it's pure, and `AnimalCard` (a
// client component) needs it without pulling this file's Prisma import (and
// therefore `pg`'s Node built-ins) into the browser bundle.

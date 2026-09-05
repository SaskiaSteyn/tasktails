/**
 * PET-06/PET-10 — recomputes an animal's `happiness`/`hunger` from
 * `lastInteractedAt` and the time elapsed since, instead of trusting the
 * stored ints directly. Pure, no Prisma import, same "pure calc" split
 * `pet-mood.ts`/`task-tiers.ts` use — `earningStatusOf()` in `economy.ts` is
 * the closest existing pattern (a stored snapshot plus an injectable `now`,
 * no write, no background job).
 *
 * Deliberately **not persisted**: PET-10's own ticket text says "calculated
 * on `GET /api/pets`, no background job required" — the stored row stays
 * exactly as PET-07/08 (pet/feed) last left it, and every read recomputes
 * the decay from there. A pet nobody has looked at in a week costs nothing
 * to "catch up" — there's no sweep to keep alive on NFR-GEN-3's $0 budget,
 * the same reasoning `grantEarnings()`'s cooldown reset uses (lazy, on the
 * next completion, never a scheduled job).
 */

/** Points of hunger gained per hour untouched (PET-8). */
const HUNGER_PER_HOUR = 5;

/** Points of happiness lost per hour untouched (PET-7). */
const HAPPINESS_PER_HOUR = 4;

const MS_PER_HOUR = 1000 * 60 * 60;

/** The two stored columns decay reads from. */
export type PetDecayInput = {
  happiness: number;
  hunger: number;
  lastInteractedAt: Date;
};

/** The same two stats, recomputed as of `now`. */
export type DecayedPetState = {
  happiness: number;
  hunger: number;
};

/**
 * Hunger rises and happiness falls at a flat rate per hour since
 * `lastInteractedAt`, each clamped to the stat's 0–100 range — the same
 * range PET-02's `moodFor()`/`stateTone()` already assume. A pet interacted
 * with in the future (clock skew, or a row seeded with a future timestamp)
 * decays by zero rather than going negative, via the `Math.max(0, …)` on
 * elapsed hours.
 *
 * Rates are flat, not a decay curve — 5/hour hunger and 4/hour happiness
 * mean an untouched pet crosses into "Hungry" or "Unhappy" (PET-02's 70/30
 * thresholds) in well under a day, so a participant who opens the app once
 * daily always has something to notice, without a background job.
 */
export function decayedStateFor(
  pet: PetDecayInput,
  now: Date = new Date(),
): DecayedPetState {
  const elapsedHours = Math.max(
    0,
    (now.getTime() - pet.lastInteractedAt.getTime()) / MS_PER_HOUR,
  );

  const hunger = Math.min(100, pet.hunger + elapsedHours * HUNGER_PER_HOUR);
  const happiness = Math.max(
    0,
    pet.happiness - elapsedHours * HAPPINESS_PER_HOUR,
  );

  return {
    happiness: Math.round(happiness),
    hunger: Math.round(hunger),
  };
}

/**
 * PET-02's mood derivation — pure, no Prisma import (unlike `src/lib/pets.ts`,
 * same "pure calc" split `task-tiers.ts` uses so a client component like
 * `AnimalCard` can import it directly without pulling `pg`/Prisma into the
 * browser bundle).
 */

/** PET-02's four visual states (happy / neutral / hungry / unhappy), best to worst. */
export type PetMood = "happy" | "neutral" | "hungry" | "unhappy";

/**
 * Derives PET-02's mood from the two stored stats directly — no time-based
 * decay here, that's PET-10's job (`GET /api/pets` recomputing `happiness`/
 * `hunger` from `lastInteractedAt` before this ever sees them). This just
 * turns whatever the two numbers currently are into one of the four states.
 *
 * Hunger is checked first: a very hungry animal reads as "Hungry" even if
 * `happiness` hasn't caught up yet, since an animal that needs feeding is a
 * more actionable signal than one that's merely not-yet-happy. Below that
 * threshold, `happiness` alone decides between "Happy", "Neutral" and
 * "Unhappy".
 */
/**
 * A pet's displayed name — its own nickname if the owner has set one,
 * falling back to `storeItem.name` (the shared species name, e.g. "Fox kit")
 * until then. Pure, so `AnimalCard`/`ZooGalleryCard` can call it directly
 * without pulling `src/lib/pets.ts`'s Prisma import into the browser bundle,
 * same reasoning this file's own header comment gives for `moodFor()`.
 */
export function petDisplayName(pet: { name: string | null; storeItem: { name: string } }): string {
  return pet.name ?? pet.storeItem.name;
}

export function moodFor(pet: { happiness: number; hunger: number }): PetMood {
  if (pet.hunger >= 70) return "hungry";
  if (pet.happiness <= 30) return "unhappy";
  if (pet.happiness >= 70) return "happy";
  return "neutral";
}

/**
 * Label and colour for each mood. Deliberately no urgency red anywhere in
 * here (AGENTS.md: that token is reserved for Group B's false-urgency
 * elements and destructive actions) — "Unhappy" is distinguished from
 * "Neutral" by weight (`ink-soft` vs the lighter `ink-faint`), not by an
 * alarming hue, and the label text carries the rest.
 */
export const MOOD_COPY: Record<PetMood, { label: string; className: string }> = {
  happy: { label: "Happy", className: "text-sage-text" },
  neutral: { label: "Neutral", className: "text-ink-faint" },
  hungry: { label: "Hungry", className: "text-amber-text" },
  unhappy: { label: "Unhappy", className: "text-ink-soft" },
};

/**
 * The traffic-light state a single stat bar is in — `design_handoff/
 * ADDENDUM-zoo-gallery.md`'s colour rule for the happiness/hunger bars
 * ("healthy = green, caution = amber, critical = terracotta"), shared between
 * the gallery's mini bars and the Sanctuary's full-size ones so the two
 * never disagree, per the addendum's own instruction.
 */
export type StateTone = "good" | "caution" | "critical";

/**
 * Same 70/30 split `moodFor()` uses, applied to whichever number represents
 * "how good is this stat right now" — deliberately *not* the raw stored
 * value, since the caller has to invert it first for a lower-is-better stat
 * like hunger (see `AnimalCard`'s `stateTone(100 - pet.hunger)`). Sharing the
 * threshold with `moodFor()` keeps a "Happy" label and a green happiness bar
 * from ever landing on opposite sides of the cutoff.
 */
export function stateTone(percentGood: number): StateTone {
  if (percentGood >= 70) return "good";
  if (percentGood <= 30) return "critical";
  return "caution";
}

/**
 * Icon/numeral text colour for each `StateTone`. Terracotta-as-text is a
 * known, already-accepted contrast exception in this palette (see the
 * globals.css audit's "UNDECIDED" block — the streak card numeral is the
 * same trade), not a new one invented here; `--color-urgency` is never an
 * option, reserved for Group B per AGENTS.md.
 */
export const STATE_TEXT_CLASS: Record<StateTone, string> = {
  good: "text-sage-text",
  caution: "text-amber-text",
  critical: "text-terracotta",
};

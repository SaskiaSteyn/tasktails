import type { CSSProperties } from "react";

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

/**
 * The repeat unit's rendered size for `backgroundImageStyle()`'s tiled
 * patterns — see that function's own comment. 44px → 90px → 160px → 500px
 * (2026-08-16/17, live user feedback each round). The first three rounds
 * kept undershooting because of what each source SVG actually contains:
 * opening one directly (e.g. `/backgrounds/hearts.svg`) shows the *whole
 * motif already repeated many times* inside that one 1080×1080 file, not a
 * single heart — so shrinking that file down to any size well under 1080px
 * just packs the same already-dense grid into a smaller box, making it
 * denser and smaller-looking, not "one big legible tile." 500px is the
 * point where individual motifs (a single heart, a single bow) finally read
 * as large, unmistakable shapes rather than fine texture, while a stage
 * panel (300px+) still shows visible repetition rather than one giant
 * unrepeated crop.
 */
const BACKGROUND_TILE_SIZE = "500px";

/**
 * A pet's equipped decoration (its background), turned into a `style` prop —
 * shared by `AnimalCard`, `ZooGalleryCard` and `PetCustomizer`'s stage, the
 * three places a pet's own gradient backdrop is drawn, so "replace the
 * gradient with the equipped background" is one rule rather than three
 * copies of the same `backgroundImage`/`backgroundSize`/`backgroundRepeat`
 * trio. Returns `undefined` for no background, so a caller can fall back to
 * its own default gradient class unconditionally: `style={backgroundImageStyle(url)}`
 * alongside `className={cn(..., !url && "bg-linear-to-b from-... to-...")}`.
 *
 * Tiled (`repeat`), not stretched (`cover`) — the backgrounds art pack is a
 * square, seamlessly-repeatable pattern (each file is itself a swatch of a
 * larger tileable design, not an illustrated scene — see
 * `BACKGROUND_TILE_SIZE`'s own comment for what that means for sizing), at
 * the user's request after the asset pack itself changed shape.
 * `backgroundSize` is a single length rather than `cover`/`contain`/a
 * percentage: the source SVGs are already square (1080×1080), so one fixed
 * value scales both axes equally regardless of the panel's own aspect ratio
 * — a percentage would scale width/height independently and stretch the
 * pattern out of square on any panel that isn't itself square. No
 * `backgroundPosition` override: `repeat`'s default top-left origin is fine
 * for a seamless tile, unlike `cover`'s single non-repeating image, which
 * needed `center` to avoid an arbitrary corner crop.
 */
export function backgroundImageStyle(url: string | undefined): CSSProperties | undefined {
  if (!url) return undefined;
  return { backgroundImage: `url(${url})`, backgroundSize: BACKGROUND_TILE_SIZE, backgroundRepeat: "repeat" };
}

import { Drumstick, Heart } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import Link from "next/link";

import { PetArt } from "@/components/pets/pet-art";
import { hasRealArt } from "@/components/store/item-visual";
import { ShinyFrame, ShinyPill } from "@/components/store/shiny";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
import { rarityTokens } from "@/lib/rarity";
import {
  backgroundImageStyle,
  moodFor,
  petDisplayName,
  stateTone,
  worseTone,
  type StateTone,
} from "@/lib/pet-mood";
import type { PetWithItem } from "@/lib/pets";

/**
 * `design_handoff/ADDENDUM-store-zoo-art.md`'s pet card — header strip
 * (name + mood face) / art region (background + pet art) / footer (stat
 * rows), replacing the single-block card `ADDENDUM-zoo-gallery.md` shipped
 * first. Distinct from `AnimalCard` (PET-02), the full Sanctuary stage this
 * links through to. Read-only and link-only, so unlike `AnimalCard` this
 * stays a server component — nothing here needs client state.
 *
 * The species/level line the previous card drew under the name is gone — the
 * addendum's card structure has no slot for it, and that detail is still one
 * tap away on the Sanctuary page.
 *
 * The art region's background is plain white until the owner equips a
 * decoration (`backgroundUrl`) — no default per-species pattern, at the
 * user's request (2026-08-17): the addendum's own example cards just happen
 * to show pets with a background already equipped, not a species-locked
 * default.
 */

/**
 * The header's mood face — a 21px line-drawn face standing in for the old
 * text mood pill, per the addendum's "mood face + bar colour must agree"
 * table. `band` is the worse of the happiness/hunger `StateTone`s
 * (`worseTone()`), not `moodFor()`'s four-state mood: the addendum only ever
 * shows three faces (smile/flat/frown), one per `StateTone`, with no
 * hunger-takes-precedence rule like the Sanctuary's own mood label has.
 */
function MoodFace({ band }: { band: StateTone }) {
  const mouth =
    band === "good"
      ? "M7.5 12.5c1 1.4 6 1.4 7 0" // smile
      : band === "caution"
        ? "M7.5 13h7" // flat
        : "M7.5 13.8c1-1.4 6-1.4 7 0"; // frown

  return (
    <svg
      width={21}
      height={21}
      viewBox="0 0 21 21"
      aria-hidden
      className="flex-none text-ink-soft"
    >
      <circle
        cx={10.5}
        cy={10.5}
        r={10}
        fill="var(--color-warm)"
        stroke="currentColor"
        strokeWidth={1.2}
      />
      <circle cx={7.6} cy={9} r={1.15} fill="currentColor" />
      <circle cx={13.4} cy={9} r={1.15} fill="currentColor" />
      <path
        d={mouth}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The art region's height. Was 126px against square 375×375 animal art; the
 * 2026-08-23 pack is a portrait 1080×1400 canvas with the top third left
 * clear for a hat, so the same 126px would have drawn most species at about
 * two-thirds of their old size. Raised to keep the animal itself roughly the
 * size it was, which is also what `min-h` on the card below tracks.
 */
const ART_REGION_HEIGHT = 150;

export function ZooGalleryCard({
  pet,
  backgroundUrl,
  accessoryUrl,
}: {
  pet: PetWithItem;
  /** This pet's equipped decoration art, if any — replaces the plain white art-region background, same as `AnimalCard`. */
  backgroundUrl?: string;
  /** This pet's equipped accessory art, if any — painted onto the animal, see `PetArt`. */
  accessoryUrl?: string;
}) {
  const name = petDisplayName(pet);
  const happinessTone = stateTone(pet.happiness);
  // Inverted for the same reason `AnimalCard` inverts it: low hunger is the
  // good end, and `stateTone()` expects "how good is this stat".
  const hungerTone = stateTone(100 - pet.hunger);
  const band = worseTone(happinessTone, hungerTone);
  // Per the addendum: only the low/red band gets the warning border — a
  // merely-caution pet stays on the plain track border, unlike the previous
  // card's own "any non-good stat" rule.
  const needsAttention = band === "critical";
  const tier = rarityTokens(pet.storeItem.rarity);

  return (
    <ShinyFrame shiny={pet.shiny}>
      <Link
        href={`/zoo/${pet.id}`}
        className={cn(
          // `text-ink`: globals.css's base `a { color: terracotta }` otherwise
          // wins by inheritance on every child that doesn't set its own colour
          // — this card is a whole-tile link, not a text link, so it needs its
          // own neutral default the way `NavTab` and `TaskRow`'s tier badge
          // already give themselves one.
          // `min-h`, not a fixed `h` — the target is ~244px tall (~175px wide,
          // left to the 2-column grid's own fluid width rather than pinned
          // here, so a narrow phone isn't forced into overflow), but nothing
          // below should ever be shorter than that even if a future card grows
          // an extra line. It tracks `ART_REGION_HEIGHT`: the addendum's own
          // ~220px was that region at 126px plus the header and footer strips.
          "flex min-h-[244px] flex-col overflow-hidden rounded-card-lg border-[1.5px] bg-surface text-ink shadow-[0_6px_14px_rgba(46,42,38,0.05)] transition-colors duration-120",
          // #276 — the tier the animal was pulled or bought at frames the
          // card, replacing this card's own `#F4D9C9` accent (UPDATE-01 §6).
          // A pet that needs attention still overrides it: that is a live
          // state someone has to act on, where the tier is a collection
          // signal, and the mood face alone is a smaller target than the
          // whole card edge. The old bespoke hex becomes `terracotta/40`,
          // which is the same pale-terracotta idea expressed as a token —
          // deliberately *not* `urgency`, which is reserved for Group B's
          // false-urgency stimuli and must not leak into neutral UI.
          needsAttention
            ? "border-terracotta/40 hover:border-terracotta/40"
            : cn(tier.frame, "hover:border-checkbox"),
        )}
      >
        <div
          className={cn(
            "flex flex-none items-center justify-between gap-2 border-b bg-warm px-[11px] py-[9px]",
            needsAttention ? "border-terracotta/40" : tier.frame,
          )}
        >
          <p className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">
            {name}
          </p>
          {pet.shiny ? <ShinyPill /> : null}
          <MoodFace band={band} />
        </div>

        <div
          className="relative flex flex-none items-center justify-center bg-surface"
          style={{
            height: ART_REGION_HEIGHT,
            ...backgroundImageStyle(backgroundUrl),
          }}
        >
          {hasRealArt(pet.storeItem.imageUrl) ? (
            // Sad for anything but a Happy mood (the user's call, 2026-08-23),
            // so a pet doesn't look content here and miserable one tap away.
            // Deliberately `moodFor()` and not this card's own `band`, even
            // though `band` is what the header face and the border use: the two
            // aren't the same test — `band` also demands hunger ≤ 30, where
            // `moodFor()` allows anything under 70 — so keying the art off
            // `band` would draw a well-fed-enough pet sad here and happy on the
            // Sanctuary. The face may therefore read caution over happy art,
            // which is the addendum's own rule for the face working as
            // specified, not a disagreement about the pet.
            //
            // Was a `grayscale` filter over the worst band only, until the art
            // pack shipped a drawn-sad cut of every species.
            <PetArt
              animalUrl={pet.storeItem.imageUrl}
              accessoryUrl={accessoryUrl}
              sad={moodFor(pet) !== "happy"}
              height={ART_REGION_HEIGHT}
              shadow="card"
              alt={name}
            />
          ) : (
            // PRO-18 — a species with no real artwork yet (`hasRealArt()`).
            // Sized closer to the real-art branch's 100px than
            // `ItemWell`/`AnimalCard`'s own smaller icon-well fallback — this
            // box is bigger than either of theirs, and a small glyph floating
            // in it read as the art region itself falling short, not just a
            // placeholder standing in (user feedback, 2026-08-17).
            <DynamicIcon
              name={pet.storeItem.imageUrl as IconName}
              size={72}
              strokeWidth={1.6}
              className={cn(
                "text-ink-soft",
                band === "critical" ? "grayscale" : null,
              )}
              aria-hidden
            />
          )}
        </div>

        {/* Per the addendum, the icon stroke stays a flat ink black on this
          card — only the bar fill (via `tone`) carries the good/caution/
          critical colour, unlike the Sanctuary's own `AnimalCard`, whose
          icon+track colour together. */}
        <div
          className={cn(
            "flex flex-col gap-[6px] border-t bg-surface px-[11px] py-[11px]",
            needsAttention ? "border-[#F4D9C9]" : "border-border-track",
          )}
        >
          <div className="flex items-center gap-1">
            <Heart size={13} strokeWidth={2.4} aria-hidden />
            <ProgressBar
              size="sm"
              tone={happinessTone}
              value={pet.happiness}
              label={`${name}'s happiness`}
              valueText={`${pet.happiness}%`}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-1">
            <Drumstick size={13} strokeWidth={2.4} aria-hidden />
            {/* Fill is fullness (100 − hunger), matching `AnimalCard`'s bar —
              the two "never disagree" per this card's own doc comment. */}
            <ProgressBar
              size="sm"
              tone={hungerTone}
              value={100 - pet.hunger}
              label={`${name}'s hunger`}
              valueText={`${pet.hunger}% hungry`}
              className="flex-1"
            />
          </div>
        </div>
      </Link>
    </ShinyFrame>
  );
}

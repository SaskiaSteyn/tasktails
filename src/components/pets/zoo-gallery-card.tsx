import { Drumstick, Heart } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import Image from "next/image";
import Link from "next/link";

import { hasRealArt } from "@/components/store/item-visual";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
import {
  backgroundImageStyle,
  MOOD_COPY,
  moodFor,
  petDisplayName,
  STATE_TEXT_CLASS,
  stateTone,
} from "@/lib/pet-mood";
import type { PetWithItem } from "@/lib/pets";

/**
 * `ADDENDUM-zoo-gallery.md`'s pet card — the gallery's "at-a-glance" tile,
 * distinct from `AnimalCard` (PET-02), which is the full Sanctuary stage
 * this links through to. Read-only and link-only, so unlike `AnimalCard`
 * this stays a server component — nothing here needs client state.
 *
 * Species gradient and "{Species} · Lvl {n}" both derive from `storeItem`
 * rather than new schema fields: species is `storeItem.name` with a trailing
 * "kit" dropped ("Fox kit" → "Fox"), and the level is `levelRequired` — the
 * level this *animal type* unlocks at, since a per-owned-animal level isn't
 * a concept the schema has.
 */

const SPECIES_GRADIENTS: Record<string, string> = {
  fox: "from-[#EAF3EC] to-[#F3ECE1]",
  penguin: "from-[#E7EEF6] to-[#F1ECF3]",
  koala: "from-[#F3ECE1] to-[#F6EDE7]",
};

function speciesOf(storeItemName: string): string {
  return storeItemName.replace(/\s+kit$/i, "");
}

export function ZooGalleryCard({
  pet,
  backgroundUrl,
}: {
  pet: PetWithItem;
  /** This pet's equipped decoration art, if any — replaces the species gradient outright, same as `AnimalCard`. */
  backgroundUrl?: string;
}) {
  const name = petDisplayName(pet);
  const mood = moodFor(pet);
  const moodCopy = MOOD_COPY[mood];
  const happinessTone = stateTone(pet.happiness);
  // Inverted for the same reason `AnimalCard` inverts it: low hunger is the
  // good end, and `stateTone()` expects "how good is this stat".
  const hungerTone = stateTone(100 - pet.hunger);
  // Per the addendum: "needs-attention... triggers when any stat falls into
  // the caution/critical band" — not just "critical", so a merely-caution
  // pet still draws the eye here even though its plain-text mood on the
  // Sanctuary screen would read "Neutral" rather than something alarming.
  const needsAttention = happinessTone !== "good" || hungerTone !== "good";

  const species = speciesOf(pet.storeItem.name);
  const gradient = SPECIES_GRADIENTS[species.toLowerCase()] ?? SPECIES_GRADIENTS.fox;

  return (
    <Link
      href={`/zoo/${pet.id}`}
      className={cn(
        // `text-ink`: globals.css's base `a { color: terracotta }` otherwise
        // wins by inheritance on every child that doesn't set its own colour
        // — this card is a whole-tile link, not a text link, so it needs its
        // own neutral default the way `NavTab` and `TaskRow`'s tier badge
        // already give themselves one.
        "flex flex-col rounded-card-lg border bg-surface px-[11px] pt-3 pb-[11px] text-ink shadow-[0_6px_14px_rgba(46,42,38,0.05)] transition-colors duration-120",
        needsAttention
          ? "border-[#F4D9C9] hover:border-[#F4D9C9]"
          : "border-border-track hover:border-checkbox",
      )}
    >
      <div
        className={cn(
          "relative flex h-[78px] items-center justify-center rounded-btn",
          !backgroundUrl && cn("bg-linear-to-b", gradient),
        )}
        style={backgroundImageStyle(backgroundUrl)}
      >
        <span
          className={cn(
            "absolute top-2 right-2 rounded-pill px-2 py-[3px] text-[9px] font-extrabold",
            needsAttention
              ? "bg-brand-soft text-terracotta-hover"
              : "bg-sage-tint text-sage",
          )}
        >
          {moodCopy.label}
        </span>
        {hasRealArt(pet.storeItem.imageUrl) ? (
          <Image
            src={pet.storeItem.imageUrl}
            alt={name}
            width={62}
            height={62}
            // Matches `AnimalCard`'s own grey-out for these two moods, so a
            // pet doesn't look full-colour here and washed-out one tap away.
            className={cn(
              "block size-[62px]",
              mood === "hungry" || mood === "unhappy" ? "grayscale" : null,
            )}
          />
        ) : (
          // PRO-18 — a species with no real artwork yet (`hasRealArt()`),
          // same icon-fallback treatment `ItemWell`/`AnimalCard` use.
          <DynamicIcon
            name={pet.storeItem.imageUrl as IconName}
            size={34}
            strokeWidth={1.8}
            className={cn(
              "text-ink-soft",
              mood === "hungry" || mood === "unhappy" ? "grayscale" : null,
            )}
            aria-hidden
          />
        )}
      </div>

      <p className="mt-2 truncate font-display text-[14px] font-semibold">
        {name}
      </p>
      <p className="text-[10px] text-ink-faint">
        {species} · Lvl {pet.storeItem.levelRequired}
      </p>

      <div className="mt-2 flex flex-col gap-[6px]">
        <div className={cn("flex items-center gap-1", STATE_TEXT_CLASS[happinessTone])}>
          <Heart size={11} strokeWidth={2.4} aria-hidden />
          <ProgressBar
            size="sm"
            tone={happinessTone}
            value={pet.happiness}
            label={`${name}'s happiness`}
            valueText={`${pet.happiness}%`}
            className="flex-1"
          />
        </div>
        <div className={cn("flex items-center gap-1", STATE_TEXT_CLASS[hungerTone])}>
          <Drumstick size={11} strokeWidth={2.4} aria-hidden />
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
  );
}

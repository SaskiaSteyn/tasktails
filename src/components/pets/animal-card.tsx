"use client";

import { Drumstick, Heart, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CustomizeSheet } from "@/components/pets/customize-sheet";
import { FeedSheet } from "@/components/pets/feed-sheet";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
// Type-only: erased at compile time, so this doesn't pull `src/lib/inventory.ts`
// or `src/lib/pets.ts`'s Prisma imports into the client bundle.
import type { InventoryItemWithStoreItem } from "@/lib/inventory";
import { MOOD_COPY, moodFor, STATE_TEXT_CLASS, stateTone } from "@/lib/pet-mood";
import type { PetWithItem } from "@/lib/pets";

/**
 * PET-02's animal card — name, image and the four mood states (happy /
 * neutral / hungry / unhappy), plus the happiness/hunger bars behind them.
 * Doubles as PET-01's per-animal "current visual state" display, since the
 * sanctuary view has nothing to show without it.
 *
 * Matches the "Sanctuary" frame's stage (`TaskTails Screens.dc.html`,
 * Petting Zoo group), including its full action row: PET-03's "Pet" button,
 * PET-04's "Feed" button and sheet, and PET-05's customize icon and sheet —
 * the fixed 52×44 square button the mock draws beside the two flex-1
 * buttons, not a flex-1 sibling itself.
 *
 * `flex-1` on the root fills the Sanctuary screen (`/zoo/[id]`) top to
 * bottom, matching the mock, since `AnimalCard` is the sole child of
 * `AppShell`'s flex-column `main` there — the stage (name/mood/image)
 * absorbs the extra height with its own `flex-1`, and the bars sit at
 * `mt-auto`, pinned to the stage's bottom. `min-h-fit` alongside it matters
 * more than it looks: this card's own `overflow-hidden` (for the gradient's
 * rounded corners) resets its flexbox automatic minimum height to 0, and
 * without an explicit floor a short viewport would shrink the card below
 * its content instead of `main` scrolling, clipping the stat bars off the
 * bottom silently. Both classes are inert in the style guide's grid, whose
 * wrapper isn't a flex container — the card just sizes to content there, as
 * before.
 *
 * Each bar's icon, numeral and fill all share one colour, driven by
 * `stateTone()` off that bar's own value — sage/amber/terracotta, not a
 * colour fixed to "this is the happiness bar" (`ADDENDUM-zoo-gallery.md`'s
 * colour rule). Hunger is inverted before it reaches `stateTone()` since low
 * hunger, not high, is the good end.
 */
export function AnimalCard({
  pet,
  foodItems,
  accessories,
}: {
  pet: PetWithItem;
  /** The user's owned food (PET-04) — per-user, not per-animal, so `/zoo/[id]` fetches it once and passes the same list to every card. */
  foodItems: InventoryItemWithStoreItem[];
  /** The user's owned accessories (PET-05) — same "fetched once, per-user" reasoning as `foodItems`. */
  accessories: InventoryItemWithStoreItem[];
}) {
  const mood = moodFor(pet);
  const { label, className } = MOOD_COPY[mood];
  // Hunger is inverted before it reaches `stateTone()`: the function expects
  // "how good is this stat", and low hunger (not hungry) is the good end,
  // the opposite direction from happiness.
  const happinessTone = stateTone(pet.happiness);
  const hungerTone = stateTone(100 - pet.hunger);
  const [notice, setNotice] = useState<string>();
  const [petting, setPetting] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const router = useRouter();

  async function handlePet() {
    // Wired to PET-07's `POST /api/pets/[id]/pet` the same day that ticket
    // shipped — same "wired the same day" convention `SubtaskList`'s
    // `handleComplete` follows for SUB-04→SUB-05. Not forward-only: unlike a
    // task's completion checkbox, petting has no local "done" state to flip,
    // so the button stays enabled and can be clicked again — `petting` only
    // guards against a second submit landing mid-flight, it never disables
    // the button afterward.
    setPetting(true);
    setNotice(undefined);
    try {
      const response = await fetch(`/api/pets/${pet.id}/pet`, { method: "POST" });
      if (!response.ok) {
        setNotice(`Couldn't pet ${pet.storeItem.name}. Try again.`);
        return;
      }
      router.refresh();
    } catch {
      setNotice("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setPetting(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-fit flex-col overflow-hidden rounded-card-lg border border-border-track bg-surface shadow-card">
      <div className="flex flex-1 flex-col items-center bg-linear-to-b from-[#EAF3EC] to-[#F3ECE1] px-4 pt-4 pb-[14px]">
        <p className="font-display text-[18px] font-semibold">{pet.storeItem.name}</p>
        <p className={cn("mt-[3px] text-[12px] font-extrabold", className)}>{label}</p>
        <Image
          src={pet.storeItem.imageUrl}
          alt={pet.storeItem.name}
          width={120}
          height={120}
          className="mt-1.5 block size-[120px]"
        />

        <div className="mt-auto flex w-full flex-col gap-[9px]">
          <div className="rounded-input border border-border-track bg-surface px-3 py-[9px]">
            <div className="mb-1.5 flex items-center text-[10.5px] font-extrabold text-ink-soft">
              <span className={cn("flex items-center gap-1", STATE_TEXT_CLASS[happinessTone])}>
                <Heart size={13} strokeWidth={2.2} />
                HAPPINESS
              </span>
            </div>
            <ProgressBar
              tone={happinessTone}
              value={pet.happiness}
              label={`${pet.storeItem.name}'s happiness`}
              valueText={`${pet.happiness}%`}
            />
          </div>
          <div className="rounded-input border border-border-track bg-surface px-3 py-[9px]">
            <div className="mb-1.5 flex items-center text-[10.5px] font-extrabold text-ink-soft">
              <span className={cn("flex items-center gap-1", STATE_TEXT_CLASS[hungerTone])}>
                <Drumstick size={13} strokeWidth={2.2} />
                HUNGER
              </span>
            </div>
            {/* Fill is fullness (100 − hunger), not raw hunger — a bigger bar
                reads as "more of a good thing" everywhere else in this app
                (happiness above, XP, quest progress), so a bar that grows
                *and* reddens as a pet gets hungrier fought that convention.
                `hungerTone` already points the right way (green at low
                hunger); flipping the fill to match is what a participant
                testing this live flagged as "backwards". `valueText` still
                announces the real hunger percentage for assistive tech. */}
            <ProgressBar
              tone={hungerTone}
              value={100 - pet.hunger}
              label={`${pet.storeItem.name}'s hunger`}
              valueText={`${pet.hunger}% hungry`}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-3">
        {/* Stretched by this wrapper, not by passing `Button` a `flex-1`
            className directly: `fullWidth={false}` emits `flex-none`, and
            `cn` is a plain join with no conflict resolution, so the two would
            race on stylesheet order instead of one clearly winning (same fix
            `EditTaskForm`'s "Save changes" needed for TASK-03). */}
        <div className="flex-1">
          <Button variant="primary" size="inline" onClick={handlePet} disabled={petting}>
            Pet
          </Button>
        </div>
        <div className="flex-1">
          <Button variant="positive" size="inline" onClick={() => setFeedOpen(true)}>
            Feed
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setCustomizeOpen(true)}
          aria-label={`Customize ${pet.storeItem.name}`}
          className="flex h-11 w-[52px] flex-none items-center justify-center rounded-input border border-border-input bg-input text-ink-soft transition-colors duration-120 hover:border-checkbox"
        >
          <Sparkles size={18} strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      {notice ? (
        <p role="alert" className="px-3 pb-3 text-[11px] font-bold text-urgency-text">
          {notice}
        </p>
      ) : null}

      <FeedSheet
        open={feedOpen}
        onOpenChange={setFeedOpen}
        petName={pet.storeItem.name}
        foodItems={foodItems}
      />

      <CustomizeSheet
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        petId={pet.id}
        petName={pet.storeItem.name}
        accessories={accessories}
      />
    </div>
  );
}

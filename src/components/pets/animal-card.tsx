"use client";

import { Drumstick, Heart, Sparkles } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { useAchievementUnlock } from "@/components/economy/achievement-unlock-provider";
import { useLevelUp } from "@/components/economy/level-up-provider";
import { FeedSheet } from "@/components/pets/feed-sheet";
import { PetArt } from "@/components/pets/pet-art";
import { hasRealArt } from "@/components/store/item-visual";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
// Type-only: erased at compile time, so this doesn't pull `src/lib/inventory.ts`
// or `src/lib/pets.ts`'s Prisma imports into the client bundle.
import type { InventoryItemWithStoreItem } from "@/lib/inventory";
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
 * PET-02's animal card — name, image and the four mood states (happy /
 * neutral / hungry / unhappy), plus the happiness/hunger bars behind them.
 * Doubles as PET-01's per-animal "current visual state" display, since the
 * sanctuary view has nothing to show without it.
 *
 * Matches the "Sanctuary" frame's stage (`TaskTails Screens.dc.html`,
 * Petting Zoo group), including its full action row: PET-03's "Pet" button,
 * PET-04's "Feed" button and sheet, and PET-05's customize icon — the fixed
 * 52×44 square button the mock draws beside the two flex-1 buttons, not a
 * flex-1 sibling itself. That icon now links to `/zoo/[id]/customize`'s own
 * full-page screen rather than opening a sheet in place — a later reworking
 * of PET-05's original bottom-sheet flow, at the user's request for a
 * dedicated screen with the pet held fixed above a scrollable accessory grid.
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

/**
 * One heart in the "Pet" button's floating-heart burst — see `spawnHearts()`.
 * `left`/`top` are pixels from the card's own top-left (measured off the
 * animal image's real position, not guessed as a percentage), and `drift` is
 * how far this particular heart wanders sideways as it climbs — set as the
 * `--pet-heart-drift` custom property the `pet-heart-float` keyframe reads,
 * since a keyframe can't itself pick a different random value per element.
 * `layer` decides whether this heart paints behind or in front of the pet's
 * art (whose wrapper is `z-10`) — mixing both, scattered across the animal's own
 * footprint rather than one shared point, is what sells "the hearts are
 * floating around the animal" rather than all of them sitting flatly on top
 * of it.
 */
type FloatingHeart = {
  id: number;
  left: number;
  top: number;
  delay: number;
  drift: number;
  layer: "behind" | "front";
};

/** How many hearts spawn per pet, and how far apart their entrances are staggered. */
const HEART_COUNT = 5;
const HEART_STAGGER_MS = 170;
/** Must match `pet-heart-float`'s own duration in globals.css. */
const HEART_ANIMATION_MS = 1200;

/**
 * How far a pointer has to travel across the animal before the stroke counts
 * as one pet. Roughly one deliberate swipe over the art — low enough that a
 * stroke feels responsive, high enough that a tap or a stray drag while
 * scrolling doesn't fire one.
 */
const STROKE_THRESHOLD_PX = 140;

export function AnimalCard({
  pet,
  foodItems,
  backgroundUrl,
  accessoryUrl,
}: {
  pet: PetWithItem;
  /** The user's owned food (PET-04) — per-user, not per-animal, so `/zoo/[id]` fetches it once and passes the same list to every card. */
  foodItems: InventoryItemWithStoreItem[];
  /** This pet's equipped decoration art, if any (`equippedBackgroundForPet()` in `src/lib/inventory.ts`) — replaces the stage's flat gradient outright when present. */
  backgroundUrl?: string;
  /** This pet's equipped accessory art, if any (`equippedAccessoryForPet()`) — painted onto the animal itself, see `PetArt`. */
  accessoryUrl?: string;
}) {
  const name = petDisplayName(pet);
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
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const nextHeartId = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const petImageRef = useRef<HTMLImageElement>(null);
  /** Live stroke gesture — last pointer position and distance travelled since the last boost. */
  const stroke = useRef<{ x: number; y: number; distance: number }>(undefined);
  // Mirrors `petting` for `handlePet()`'s own re-entrancy guard. A ref, not
  // the state, because the state is only readable as of the last render:
  // several pointer moves (or a double-click on the button) can land in a
  // single tick, and every one of them would still see `petting === false`.
  // Two overlapping POSTs is not merely wasted work — both read the same
  // decayed baseline and write `baseline + 7`, so the second is a lost
  // update: one visible boost, but two interactions recorded against the
  // petting achievements. Measured live, not theorised.
  const pettingRef = useRef(false);
  const router = useRouter();
  const { celebrate: celebrateAchievements } = useAchievementUnlock();
  const { celebrate: celebrateLevelUp } = useLevelUp();

  // A burst of hearts scattered across the animal itself, at the user's
  // request — earlier versions climbed from the "Pet" button, which sits
  // well below the stage: by the time a heart had climbed far enough to
  // reach the animal's height, its short 1.2s life was already over, so the
  // "some behind, some in front of the animal" layering below never had
  // anything to actually appear behind or in front of. Measuring the image
  // itself instead means the burst starts already overlapping the animal.
  // Purely decorative, no server round trip of its own, so it fires from
  // `handlePet()` and `FeedSheet`'s `onFed` on success rather than being
  // driven by `pet.happiness` (which would also fire on an unrelated page
  // refresh).
  function spawnHearts() {
    const card = cardRef.current;
    const image = petImageRef.current;
    // Both refs are attached to plain DOM nodes that exist for the whole
    // life of this component, so this only fails to measure if the layout
    // hasn't painted yet — skip the flourish rather than guess a position.
    if (!card || !image) return;

    const cardRect = card.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const originLeft = imageRect.left + imageRect.width / 2 - cardRect.left;
    const originTop = imageRect.top + imageRect.height / 2 - cardRect.top;

    const batch: FloatingHeart[] = Array.from({ length: HEART_COUNT }, (_, i) => ({
      id: nextHeartId.current++,
      // Scattered across the animal's whole width/height, not jittered
      // around one shared point — this is what keeps the burst from reading
      // as a single row or a single "poof" location, and is also what gives
      // the front/behind layering below something to actually show: a heart
      // landing near the animal's edge reads clearly as one or the other,
      // where one dead centre would barely peek out either way.
      left: originLeft + (Math.random() * imageRect.width - imageRect.width / 2),
      top: originTop + (Math.random() * imageRect.height - imageRect.height / 2),
      delay: i * HEART_STAGGER_MS,
      // Independent left/right wander per heart as it climbs — this is what
      // keeps five hearts from reading as a single row that moves as one
      // block; each one drifts its own way instead.
      drift: Math.random() * 64 - 32,
      // Randomised per heart, not alternated by index — an alternating
      // pattern would itself read as a regular, predictable order.
      layer: Math.random() < 0.5 ? "behind" : "front",
    }));
    setHearts((current) => [...current, ...batch]);

    const batchIds = new Set(batch.map((heart) => heart.id));
    setTimeout(
      () => setHearts((current) => current.filter((heart) => !batchIds.has(heart.id))),
      (HEART_COUNT - 1) * HEART_STAGGER_MS + HEART_ANIMATION_MS,
    );
  }

  // Stroking the animal is the same interaction as the "Pet" button — same
  // request, same hearts — just reachable by dragging across the art. Raw
  // pointer events rather than a gesture library: one accumulated distance is
  // the whole gesture. Pointer capture keeps the stroke alive when the finger
  // wanders off the image mid-swipe, and tracking our own last position
  // instead of `movementX/Y` is deliberate — Safari reports 0 for those on
  // touch pointers, which would make the gesture mouse-only.
  function handleStrokeStart(event: React.PointerEvent<HTMLDivElement>) {
    stroke.current = { x: event.clientX, y: event.clientY, distance: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleStrokeMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = stroke.current;
    if (!previous) return;
    previous.distance += Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
    previous.x = event.clientX;
    previous.y = event.clientY;
    if (previous.distance < STROKE_THRESHOLD_PX) return;
    // Reset rather than end the gesture: a long, continuous stroke keeps
    // petting, one boost per threshold crossed. `handlePet()`'s own guard is
    // what stops a fast swipe stacking POSTs, so there's no second check here.
    previous.distance = 0;
    void handlePet();
  }

  function handleStrokeEnd() {
    stroke.current = undefined;
  }

  async function handlePet() {
    // Wired to PET-07's `POST /api/pets/[id]/pet` the same day that ticket
    // shipped — same "wired the same day" convention `SubtaskList`'s
    // `handleComplete` follows for SUB-04→SUB-05. Not forward-only: unlike a
    // task's completion checkbox, petting has no local "done" state to flip,
    // so the button stays enabled and can be clicked again — `petting` only
    // guards against a second submit landing mid-flight, it never disables
    // the button afterward.
    // The one re-entrancy guard for both callers — the "Pet" button and the
    // stroke gesture — rather than one per caller, which is what let the
    // stroke double-fire.
    if (pettingRef.current) return;
    pettingRef.current = true;
    setPetting(true);
    setNotice(undefined);
    try {
      const response = await fetch(`/api/pets/${pet.id}/pet`, { method: "POST" });
      if (!response.ok) {
        setNotice(`Couldn't pet ${name}. Try again.`);
        return;
      }
      const body = await response.json();
      spawnHearts();
      celebrateAchievements(body.achievementsUnlocked);
      // PRO-18 — petting itself grants no XP, but the achievements it can
      // trigger ("pet animals 50 times" etc.) do.
      celebrateLevelUp(body.levelUp);
      router.refresh();
    } catch {
      setNotice("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      pettingRef.current = false;
      setPetting(false);
    }
  }

  return (
    <div
      ref={cardRef}
      className="relative flex flex-1 min-h-fit flex-col overflow-hidden rounded-card-lg border border-border-track bg-surface"
    >
      <div
        className={cn(
          "flex flex-1 flex-col items-center px-4 pt-4 pb-[14px]",
          !backgroundUrl && "bg-linear-to-b from-[#EAF3EC] to-[#F3ECE1]",
        )}
        style={backgroundImageStyle(backgroundUrl)}
      >
        <p className="font-display text-[18px] font-semibold">{name}</p>
        <p className={cn("mt-[3px] text-[12px] font-extrabold", className)}>{label}</p>
        {/* `flex-1 min-h-0` is what lets the animal claim whatever vertical
            room the stage isn't using for the name/mood label above it and
            the stat bars (`mt-auto`) below it, instead of sitting at a fixed
            size with dead space around it — `fill` is next/image's mode for
            "size to the parent", with `object-contain` so a non-square
            parent box (or a small phone, per NFR-GEN-2) letterboxes the
            animal rather than stretching it. `max-w-[360px]` keeps it from
            ballooning past a sensible size on a wide desktop card. */}
        {/* PRO-18: the ref moved from the image itself to this wrapper so
            `spawnHearts()` still has something to measure when the species
            has no real artwork yet and renders a centred icon instead —
            under `fill`, the wrapper's box is exactly the image's own, so
            this is not a behaviour change for animals that do have art. */}
        <div
          ref={petImageRef}
          onPointerDown={handleStrokeStart}
          onPointerMove={handleStrokeMove}
          onPointerUp={handleStrokeEnd}
          onPointerCancel={handleStrokeEnd}
          // `touch-none` so a stroke on the animal isn't eaten by the page's
          // own scrolling. The "Pet" button below stays the keyboard and
          // screen-reader path — this is a shortcut, not the only way in.
          className="relative z-10 mt-1.5 min-h-0 w-full max-w-[360px] flex-1 cursor-grab touch-none active:cursor-grabbing"
        >
          {hasRealArt(pet.storeItem.imageUrl) ? (
            // The pack's own sad cut for every mood that isn't "Happy" (the
            // user's call, 2026-08-23) — so the art agrees with the label
            // above it rather than lagging a state behind, and the cue reads
            // before either the label or the stat bars do. This was a
            // `grayscale` filter over the two *worst* moods until the art
            // pack started shipping a drawn-sad version of every species; a
            // real frown says it better than a desaturated smile did, and the
            // greyed-out pet had also been read as "this animal is disabled".
            //
            // Only two cuts exist, so "Neutral" and "Unhappy" share the sad
            // one — a pet is drawn happy exactly when `MOOD_COPY` calls it
            // Happy, and drawn sad otherwise.
            <PetArt
              animalUrl={pet.storeItem.imageUrl}
              accessoryUrl={accessoryUrl}
              sad={mood !== "happy"}
              fill
              sizes="(min-width: 480px) 360px, 70vw"
              shadow="stage"
              alt={name}
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <DynamicIcon
                name={pet.storeItem.imageUrl as IconName}
                size={96}
                strokeWidth={1.6}
                className={cn(
                  "text-ink-soft",
                  mood === "hungry" || mood === "unhappy" ? "grayscale" : null,
                )}
                aria-hidden
              />
            </div>
          )}
        </div>

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
              label={`${name}'s happiness`}
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
              label={`${name}'s hunger`}
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
        <Link
          href={`/zoo/${pet.id}/customize`}
          aria-label={`Customize ${name}`}
          className="flex h-11 w-[52px] flex-none items-center justify-center rounded-input border border-border-input bg-input text-ink-soft transition-colors duration-120 hover:border-checkbox"
        >
          <Sparkles size={18} strokeWidth={2.2} aria-hidden />
        </Link>
      </div>

      {notice ? (
        <p role="alert" className="px-3 pb-3 text-[11px] font-bold text-urgency-text">
          {notice}
        </p>
      ) : null}

      {/* Rendered last so a `layer: "front"` heart paints over the stage/
          bars/buttons; a `layer: "behind"` heart still climbs past the
          animal, not under it, because its `z-0` only loses to the art's
          own `z-10` — both are still above the stage's plain, unpositioned
          background. Positioned in real pixels off the card's own top-left
          (measured in `spawnHearts()`), not a percentage guess at where the
          button roughly is. */}
      {hearts.map((heart) => (
        <Heart
          key={heart.id}
          aria-hidden
          fill="currentColor"
          className={cn(
            // Sized off the viewport (`vw`), not the card, per the user's
            // "relative to screen size" ask — clamped so it neither
            // disappears on a small phone nor balloons on a wide one.
            "pointer-events-none absolute size-[clamp(30px,8vw,52px)] text-terracotta [animation:pet-heart-float_1200ms_ease-out_forwards]",
            heart.layer === "behind" ? "z-0" : "z-20",
          )}
          style={
            {
              left: `${heart.left}px`,
              top: `${heart.top}px`,
              animationDelay: `${heart.delay}ms`,
              "--pet-heart-drift": `${heart.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}

      <FeedSheet
        open={feedOpen}
        onOpenChange={setFeedOpen}
        onFed={spawnHearts}
        petId={pet.id}
        petName={name}
        foodItems={foodItems}
      />
    </div>
  );
}

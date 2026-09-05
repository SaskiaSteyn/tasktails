import type { Pet, Prisma, StoreItem } from "@/generated/prisma/client";

import {
  incrementFeedInteractionCount,
  incrementPetInteractionCount,
} from "@/lib/economy";
import {
  consumeFoodItem,
  equipCustomization,
  type InventoryItemWithStoreItem,
  unequipCustomization,
} from "@/lib/inventory";
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

/** How many animals this user owns (PRO-04/05's "animals owned" lifetime stat). */
export async function petCount(userId: string): Promise<number> {
  return prisma.pet.count({ where: { userId } });
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
 *
 * **PRO-18**: also bumps `Pet.timesPetted` and `UserEconomy.
 * lifetimePetInteractions` (the "pet an animal 50 times" / "pet every type
 * you own" achievements' data) inside one transaction with the stats write
 * — both describe the same interaction, so either both land or neither
 * does. The counter increment goes through `economy.ts`'s
 * `incrementPetInteractionCount()` rather than touching `prisma.userEconomy`
 * directly, per this module's own "nothing outside it touches `prisma.pet`,
 * and it returns the favour for tables it doesn't own" rule.
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

  return prisma.$transaction(async (tx) => {
    await incrementPetInteractionCount(tx, userId);
    return tx.pet.update({
      where: { id: petId },
      data: {
        happiness,
        hunger: decayed.hunger,
        lastInteractedAt: now,
        timesPetted: { increment: 1 },
      },
      include: { storeItem: true },
    });
  });
}

/** PET-04's feed sheet's "Feed" boost/relief (README's mock: "Feed: hunger −18 (min 0) + happiness +4"). */
const FEED_HUNGER_DELTA = -18;
const FEED_HAPPINESS_BOOST = 4;

/**
 * What `recordFeedInteraction()` reports back — three outcomes, not just
 * found/not-found, because feeding has two independent things that can be
 * wrong (the pet id, the inventory item id) and the route needs to tell
 * them apart to answer with the right 404 message. Modelled as a
 * discriminated union rather than throwing, so a normal "you don't have
 * that food anymore" isn't handled via exceptions the way an actual server
 * error would be.
 */
export type FeedResult =
  | { ok: true; pet: PetWithItem; item: InventoryItemWithStoreItem }
  | { ok: false; reason: "pet-not-found" | "item-not-found" };

/**
 * PET-08 — records a "Feed" interaction (PET-04's sheet): validates the
 * food item is the caller's, decrements it, and applies its hunger/happiness
 * deltas to the pet — all inside one `prisma.$transaction`, since a feed
 * that consumed the item without updating the pet (or the reverse) would be
 * a real, visible inconsistency, not just a display glitch. The actual
 * decrement is `consumeFoodItem()` in `src/lib/inventory.ts` — this module
 * doesn't touch `prisma.inventoryItem` directly, same rule that file's own
 * comment states for `prisma.pet`.
 *
 * The pet's existence is checked with `findPetRaw()` *before* opening the
 * transaction — cheap, read-only, and means a bad pet id fails fast without
 * ever touching the food item, rather than decrementing it and then
 * discovering the pet doesn't exist. The pet's row is then decayed exactly
 * once inside the transaction (`decayedStateFor()`, same "raw row in, decay
 * once" reasoning `recordPetInteraction()` documents) before the feed
 * deltas are added on top, so a stale pet's stats are caught up to their
 * true current value at the same moment the boost is credited — same fix
 * PET-07's live-testing bug required, applied here from the start rather
 * than needing a second round of testing to find it again.
 *
 * Not forward-only, same as `recordPetInteraction()` — feeding has no local
 * "done" state, so this can run again as many times as the caller has food
 * for.
 */
export async function recordFeedInteraction(
  userId: string,
  petId: string,
  inventoryItemId: string,
  now: Date = new Date(),
): Promise<FeedResult> {
  const pet = await findPetRaw(userId, petId);
  if (!pet) return { ok: false, reason: "pet-not-found" };

  return prisma.$transaction(async (tx) => {
    const item = await consumeFoodItem(tx, userId, inventoryItemId);
    if (!item) return { ok: false, reason: "item-not-found" };

    // PRO-18 — "feed animals 50 times" achievement data; see
    // `recordPetInteraction()`'s doc comment for why this goes through
    // `economy.ts` rather than touching `prisma.userEconomy` here.
    await incrementFeedInteractionCount(tx, userId);

    const decayed = decayedStateFor(pet, now);
    const hunger = Math.max(0, decayed.hunger + FEED_HUNGER_DELTA);
    const happiness = Math.min(100, decayed.happiness + FEED_HAPPINESS_BOOST);

    const updatedPet = await tx.pet.update({
      where: { id: petId },
      data: { happiness, hunger, lastInteractedAt: now },
      include: { storeItem: true },
    });

    return { ok: true, pet: updatedPet, item };
  });
}

/**
 * What `recordCustomizeInteraction()` reports back — `pet-not-found` and
 * `item-not-found` each map to their own 404 message (same shape/reason as
 * `FeedResult`), and `equipped-elsewhere` (#215 — the accessory or
 * background is already on another pet) maps to a 409 in the route. No `pet`
 * on success, unlike `FeedResult` — customizing never touches the `Pet` row
 * itself (PET-09's own scope is "set `equippedToPetId` on `InventoryItem`",
 * nothing about happiness/hunger), so there's nothing pet-shaped to hand back.
 */
export type CustomizeResult =
  | { ok: true; item: InventoryItemWithStoreItem }
  | { ok: false; reason: "pet-not-found" | "item-not-found" | "equipped-elsewhere" };

/**
 * PET-09 — records a "Customize" interaction (PET-05's sheet): equips an
 * accessory *or* a decoration (a pet's background) to a pet, whichever
 * category the item actually is — the equip logic itself is
 * `equipCustomization()` in `src/lib/inventory.ts` — this module doesn't
 * touch `prisma.inventoryItem` directly, same rule that file's own comment
 * states for `prisma.pet`.
 *
 * The pet's existence/ownership is checked with `findPetRaw()` *before*
 * opening the transaction, same "fail fast, cheap read-only check first"
 * shape `recordFeedInteraction()` uses — a bad pet id must not be able to
 * equip anything, to anyone, let alone unequip whatever a *real* pet
 * already had on.
 *
 * Wrapped in `prisma.$transaction` even though a single item move isn't
 * racy the way `consumeFoodItem()`'s quantity decrement is (see
 * `equipCustomization()`'s own comment on why) — the transaction here is
 * about keeping "unequip the old one" and "equip the new one" as one atomic
 * write, not about guarding against concurrent requests.
 *
 * Not forward-only, same as feeding/petting — equipping the same or a
 * different accessory/decoration can be repeated freely.
 */
export async function recordCustomizeInteraction(
  userId: string,
  petId: string,
  inventoryItemId: string,
): Promise<CustomizeResult> {
  const pet = await findPetRaw(userId, petId);
  if (!pet) return { ok: false, reason: "pet-not-found" };

  return prisma.$transaction(async (tx) => {
    const result = await equipCustomization(tx, userId, petId, inventoryItemId);
    if (!result.ok) {
      return {
        ok: false,
        reason: result.reason === "not-found" ? "item-not-found" : "equipped-elsewhere",
      };
    }

    return { ok: true, item: result.item };
  });
}

/**
 * The reverse of `recordCustomizeInteraction()`, at the user's request:
 * tapping the already-equipped tile again clears it instead of being a
 * no-op. Same shape as its counterpart — `findPetRaw()` first so a bad pet
 * id can't unequip anything, the real work delegated to
 * `unequipCustomization()` in `src/lib/inventory.ts` for the same
 * "this module never touches `prisma.inventoryItem` directly" reason.
 *
 * No achievement/level-up evaluation here unlike the equip path — PRO-09's
 * trigger points are about *owning/wearing* something, and clearing a slot
 * back to nothing doesn't newly satisfy any criterion an equip could.
 */
export async function recordUnequipInteraction(
  userId: string,
  petId: string,
  inventoryItemId: string,
): Promise<CustomizeResult> {
  const pet = await findPetRaw(userId, petId);
  if (!pet) return { ok: false, reason: "pet-not-found" };

  return prisma.$transaction(async (tx) => {
    const item = await unequipCustomization(tx, userId, petId, inventoryItemId);
    if (!item) return { ok: false, reason: "item-not-found" };

    return { ok: true, item };
  });
}

/**
 * The customize screen's rename control — sets a pet's own nickname,
 * overriding the shared `storeItem.name` (`petDisplayName()` in
 * `src/lib/pet-mood.ts` picks between the two for display). `updateMany`'s
 * `where: { id, userId }` is the ownership check itself, same "guarded write
 * instead of a separate read" shape `consumeFoodItem()` uses — a pet id that
 * exists but belongs to someone else matches zero rows rather than renaming
 * it. Returns null in that case (or when the id doesn't exist at all), same
 * "can't tell the difference" shape `petForUser()` documents.
 */
export async function renamePet(
  userId: string,
  petId: string,
  name: string,
  now: Date = new Date(),
): Promise<PetWithItem | null> {
  const { count } = await prisma.pet.updateMany({
    where: { id: petId, userId },
    data: { name },
  });
  if (count === 0) return null;

  const pet = await findPetRaw(userId, petId);
  return pet ? { ...pet, ...decayedStateFor(pet, now) } : null;
}

/** A freshly-adopted animal's starting stats — full and unhungry, so acquisition itself never puts a new pet in a bad state. */
const NEW_PET_HAPPINESS = 100;
const NEW_PET_HUNGER = 0;

/**
 * PET-11 — creates a `Pet` row for a completed `Transaction`, but only when
 * it was for an `ANIMALS` item; returns `null` for every other category,
 * since food/accessories/decorations become `InventoryItem` rows instead
 * (STOR-16's job, not this one — a `Transaction` and the row it produces
 * are two different shapes depending on what was bought, and this function
 * only ever owns the animal branch).
 *
 * Takes a `Prisma.TransactionClient`, not `prisma` itself, and the
 * `storeItem` the caller already validated (levelRequired, coinPrice) while
 * pricing the purchase, rather than re-fetching it here — STOR-16 (the
 * checkout endpoint; unbuilt) is expected to call this from inside the same
 * transaction that writes the `Transaction` row, the same "caller owns the
 * transaction, hands over what it already has" shape `consumeFoodItem()`/
 * `equipAccessory()` use for `InventoryItem`. A completed purchase of an
 * animal that didn't actually produce a pet (or the reverse — a stray `Pet`
 * row with no matching `Transaction`) would be a real, silent
 * inconsistency, not just a display glitch.
 *
 * **No caller exists yet** — the store (STOR-01…STOR-16) hasn't shipped, so
 * nothing in this app creates a `Transaction` row today. This is still
 * fully real, tested code rather than a stub: once STOR-16 exists, "create
 * the `Transaction` row, then call this with the same `tx`" is the entire
 * integration — no further design work needed here, the same way PET-07/08
 * already built on top of PET-06's decay math before anything called
 * `GET /api/pets` for real.
 *
 * `lastInteractedAt: now` rather than some earlier moment, so decay
 * (PET-10) counts from the moment of acquisition — a pet doesn't arrive
 * already stale. Starting happiness/hunger (100/0) aren't specified
 * anywhere in Requirements.md or the design handoff, the same "not
 * specified, had to choose" situation PET-06 documents for its decay
 * rate — a freshly adopted animal starting happy and fed is the one choice
 * that doesn't invent a second, unrelated number to go with it.
 */
export async function createPetForTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  storeItem: Pick<StoreItem, "id" | "category">,
  now: Date = new Date(),
): Promise<PetWithItem | null> {
  if (storeItem.category !== "ANIMALS") return null;

  return tx.pet.create({
    data: {
      userId,
      storeItemId: storeItem.id,
      happiness: NEW_PET_HAPPINESS,
      hunger: NEW_PET_HUNGER,
      lastInteractedAt: now,
    },
    include: { storeItem: true },
  });
}

// PET-02's mood derivation (`PetMood`, `moodFor()`, `MOOD_COPY`) lives in
// `src/lib/pet-mood.ts` instead of here — it's pure, and `AnimalCard` (a
// client component) needs it without pulling this file's Prisma import (and
// therefore `pg`'s Node built-ins) into the browser bundle.

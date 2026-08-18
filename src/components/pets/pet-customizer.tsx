"use client";

import { Check, ChevronLeft, Pencil, Plus } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import {
  AchievementUnlockScreen,
  type AchievementUnlockLike,
} from "@/components/economy/achievement-unlock-screen";
import type { LevelUpEventLike } from "@/components/economy/level-up-provider";
import { LevelUpScreen } from "@/components/economy/level-up-screen";
import { AppShell } from "@/components/layout/app-shell";
import { hasRealArt, ItemWell } from "@/components/store/item-visual";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
// Type-only: erased at compile time, same reasoning `AnimalCard` documents
// for `PetWithItem`/`InventoryItemWithStoreItem` — this stays a client
// component without pulling `src/lib/pets.ts`/`src/lib/inventory.ts`'s
// Prisma imports into the browser bundle.
import type { InventoryItemWithStoreItem } from "@/lib/inventory";
import { backgroundImageStyle, petDisplayName } from "@/lib/pet-mood";
import type { PetWithItem } from "@/lib/pets";

/** The customize screen's two equippable categories, and the tab that shows each. */
type CustomizeTab = "accessories" | "decorations";

const TAB_COPY: Record<
  CustomizeTab,
  { label: string; heading: string; addLabel: string; storeCategory: "ACCESSORIES" | "DECORATIONS" }
> = {
  accessories: {
    label: "Accessories",
    heading: "Your accessories",
    addLabel: "Add accessory",
    storeCategory: "ACCESSORIES",
  },
  decorations: {
    label: "Decorations",
    heading: "Your decorations",
    addLabel: "Add decoration",
    storeCategory: "DECORATIONS",
  },
};

/**
 * The full-page customize screen, replacing PET-05's original bottom sheet
 * (`CustomizeSheet`, since removed) at the user's request: a dedicated
 * screen with the pet fixed at the top and its owned accessories scrollable
 * underneath, rather than a modal that closed after one pick. Matches the
 * design handoff's "Customize Mochi" frame (`TaskTails Screens.dc.html`,
 * Petting Zoo group) — pet stage panel up top, owned-items grid below —
 * filtered to owned items only, per this ticket's own scope (the mock's
 * dashed locked/gated tiles and "OTHER ANIMALS" row are a different concern
 * this rework doesn't touch).
 *
 * Tapping an owned accessory equips it immediately — no separate "Equip"
 * button, unlike the old sheet — so the pet visibly "wears" it as its own
 * preview. Since accessory art is an icon name rather than a positioned
 * overlay image (`imageUrl` is a `lucide-react/dynamic` icon name, same cast
 * `CustomizeSheet` used), the preview is a badge over the pet's own image
 * rather than a literal composited garment — the clearest "here's what's
 * equipped" treatment the real data supports.
 *
 * A second tab, Decorations, was added later for the `DECORATIONS`
 * category once those items grew real background art (`public/backgrounds/`)
 * — named to match the store's own category label (`CATEGORY_LABEL.DECORATIONS`
 * in `item-visual.tsx`) rather than "Backgrounds", since this tab's "Add
 * decoration" tile deep-links to that exact store category and calling the
 * same category two different things across the two screens read as a
 * mismatch. Unlike accessories, a decoration's preview *is* a literal
 * composited image: the equipped one replaces the stage panel's flat
 * gradient outright (`backgroundImageStyle()` in `src/lib/pet-mood.ts`), the
 * same treatment `AnimalCard`/`ZooGalleryCard` give it wherever else the pet
 * is shown. The two tabs share one tap flow (`handleTap()`/`POST`+`DELETE
 * .../customize`) but track separate optimistic "currently equipped" ids,
 * since the server now equips at most one item *per category*, not one
 * overall — equipping a decoration must never visibly unequip an accessory,
 * or the reverse.
 *
 * Grid tiles are square and label-less: the item's art fills the whole
 * frame, with no name underneath (user request, 2026-08-18 — the names read
 * as clutter under art that already identifies the item, and the tab above
 * already says which category you're looking at). Both the item tiles and
 * the trailing "Add …" tile carry their text as `aria-label` instead, so
 * nothing is lost to a screen reader.
 *
 * Each grid ends with a dashed "Add accessory"/"Add decoration" tile linking
 * to `/store?category=...` (`StoreBrowser`'s `initialCategory`, `StorePage`'s
 * own `?category=` deep link) — same "grid always renders, even with nothing
 * owned yet" shape `ZooPage`'s "Adopt another" tile uses, at the user's
 * explicit request to match it, replacing this screen's earlier separate
 * empty-state prompt (a full "No accessories"/"nothing to wear yet, go to
 * the store" block that only appeared at zero owned items).
 *
 * No `nav` on `AppShell` — a focused drill-in from the Sanctuary screen, same
 * "no bottom nav" call `EditTaskPage` makes for the same reason (this is an
 * edit flow, not tab content).
 *
 * Equipping is one of PRO-09's three achievement-unlock trigger points, but
 * this renders `AchievementUnlockScreen` directly off local state rather
 * than `useAchievementUnlock()` — unlike `TaskList`/`CartPanel`, this
 * component *instantiates* `AppShell` itself rather than being rendered
 * inside one, so it sits above `AppShell`'s provider in the tree and a hook
 * call here could never see it. Same reasoning the style guide's
 * `LevelUpDemo` documents for rendering `LevelUpScreen` directly — which
 * PRO-18 now also does here, off its own local queue, since equipping grants
 * no XP itself but an achievement it unlocks can.
 */
export function PetCustomizer({
  pet,
  accessories,
  decorations,
}: {
  pet: PetWithItem;
  accessories: InventoryItemWithStoreItem[];
  /** Owned DECORATIONS inventory — the Decorations tab's grid. */
  decorations: InventoryItemWithStoreItem[];
}) {
  const router = useRouter();
  const nameInputId = useId();

  const [name, setName] = useState(() => petDisplayName(pet));
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [nameError, setNameError] = useState<string>();
  const [savingName, setSavingName] = useState(false);

  const [tab, setTab] = useState<CustomizeTab>("accessories");

  // One equipped id per category, not one shared id — `equipCustomization()`
  // (src/lib/inventory.ts) only ever displaces whatever the pet had on *in
  // the same category*, so an accessory and a background can be equipped at
  // once and each needs its own optimistic-update slot.
  const [equippedAccessoryId, setEquippedAccessoryId] = useState(
    () => accessories.find((item) => item.equippedToPetId === pet.id)?.id,
  );
  const [equippedDecorationId, setEquippedDecorationId] = useState(
    () => decorations.find((item) => item.equippedToPetId === pet.id)?.id,
  );
  const [equipping, setEquipping] = useState(false);
  const [equipError, setEquipError] = useState<string>();
  const [achievementQueue, setAchievementQueue] = useState<
    AchievementUnlockLike[]
  >([]);
  const [levelUpQueue, setLevelUpQueue] = useState<LevelUpEventLike[]>([]);

  const equippedAccessory = accessories.find((item) => item.id === equippedAccessoryId);
  const equippedDecoration = decorations.find((item) => item.id === equippedDecorationId);
  const backgroundUrl =
    equippedDecoration && hasRealArt(equippedDecoration.storeItem.imageUrl)
      ? equippedDecoration.storeItem.imageUrl
      : undefined;

  const items = tab === "accessories" ? accessories : decorations;
  const equippedId = tab === "accessories" ? equippedAccessoryId : equippedDecorationId;
  const copy = TAB_COPY[tab];

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError("Give your pet a name.");
      return;
    }
    if (trimmed === name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    setNameError(undefined);
    try {
      const response = await fetch(`/api/pets/${pet.id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setNameError(body?.fieldErrors?.name ?? body?.error ?? "Couldn't save that name. Try again.");
        return;
      }
      setName(trimmed);
      setEditingName(false);
      router.refresh();
    } catch {
      setNameError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setSavingName(false);
    }
  }

  /**
   * Tapping a tile equips it — except tapping the tile that's *already*
   * equipped, which unequips it instead, at the user's request (previously a
   * no-op: clicking the selected tile did nothing, with no way to clear a
   * slot back to "nothing equipped" short of picking a different item).
   */
  async function handleTap(item: InventoryItemWithStoreItem) {
    // Which optimistic-update slot this item belongs to — an accessory can
    // never displace a background's slot or vice versa, matching the
    // category-scoped equip on the server (`equipCustomization()`).
    const isDecoration = item.storeItem.category === "DECORATIONS";
    const currentId = isDecoration ? equippedDecorationId : equippedAccessoryId;
    const setCurrentId = isDecoration ? setEquippedDecorationId : setEquippedAccessoryId;
    if (equipping) return;

    const alreadyEquipped = item.id === currentId;
    setCurrentId(alreadyEquipped ? undefined : item.id);
    setEquipping(true);
    setEquipError(undefined);
    try {
      const response = await fetch(`/api/pets/${pet.id}/customize`, {
        method: alreadyEquipped ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: item.id }),
      });
      if (!response.ok) {
        setCurrentId(currentId);
        setEquipError(
          alreadyEquipped
            ? `Couldn't unequip ${item.storeItem.name}. Try again.`
            : `Couldn't equip ${item.storeItem.name}. Try again.`,
        );
        return;
      }
      // Unequipping never unlocks anything (`recordUnequipInteraction()`'s
      // own doc comment), so `DELETE`'s response carries no achievement/
      // level-up data to check here the way `POST`'s does.
      if (!alreadyEquipped) {
        const body = await response.json();
        if (body.achievementsUnlocked?.length) {
          setAchievementQueue((current) => [...current, ...body.achievementsUnlocked]);
        }
        if (body.levelUp) {
          setLevelUpQueue((current) => [...current, body.levelUp]);
        }
      }
      router.refresh();
    } catch {
      setCurrentId(currentId);
      setEquipError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setEquipping(false);
    }
  }

  return (
    <AppShell
      header={
        <header
          // 8px top / 18px sides / 14px bottom, safe-area-aware — see the
          // note on this same header shape in settings/page.tsx.
          className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] py-[14px]"
        >
          <Link
            href={`/zoo/${pet.id}`}
            aria-label={`Back to ${name}'s sanctuary`}
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="min-w-0 truncate font-display text-[19px] leading-[1.15] font-semibold">
            Customize {name}
          </h1>
        </header>
      }
      className="gap-4 p-4"
    >
      <div
        className={cn(
          "flex flex-none flex-col items-center rounded-card-lg px-4 py-5",
          !backgroundUrl && "bg-linear-to-b from-[#EAF3EC] to-[#F3ECE1]",
        )}
        style={backgroundImageStyle(backgroundUrl)}
      >
        <div className="relative size-[118px]">
          {hasRealArt(pet.storeItem.imageUrl) ? (
            <Image
              src={pet.storeItem.imageUrl}
              alt={name}
              width={118}
              height={118}
              className="block size-[118px]"
            />
          ) : (
            // PRO-18 — a species with no real artwork yet, same
            // icon-fallback treatment `ItemWell`/`AnimalCard` use.
            <div className="flex size-[118px] items-center justify-center rounded-full bg-input">
              <DynamicIcon
                name={pet.storeItem.imageUrl as IconName}
                size={56}
                strokeWidth={1.6}
                className="text-ink-soft"
                aria-hidden
              />
            </div>
          )}
          {equippedAccessory ? (
            <span
              aria-hidden
              className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-violet-tint text-violet-text ring-2 ring-surface shadow-card"
            >
              <DynamicIcon
                name={equippedAccessory.storeItem.imageUrl as IconName}
                size={18}
                strokeWidth={2.2}
              />
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex min-h-8 items-center">
          {editingName ? (
            <form onSubmit={handleRename} className="flex items-center gap-1.5">
              <label htmlFor={nameInputId} className="sr-only">
                Pet name
              </label>
              <input
                id={nameInputId}
                value={nameValue}
                onChange={(event) => {
                  setNameValue(event.target.value);
                  setNameError(undefined);
                }}
                maxLength={30}
                autoFocus
                disabled={savingName}
                className="w-32 rounded-input border border-border-input bg-surface px-2.5 py-1.5 text-center font-display text-[16px] font-semibold text-ink"
              />
              <Button type="submit" size="inline" fullWidth={false} disabled={savingName} className="px-3">
                {savingName ? "Saving…" : "Save"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setNameValue(name);
                  setNameError(undefined);
                  setEditingName(false);
                }}
                disabled={savingName}
                className="rounded-chip px-2 py-1 text-[13px] font-bold text-ink-soft transition-colors duration-120 hover:text-ink"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameValue(name);
                setEditingName(true);
              }}
              aria-label={`Rename ${name}`}
              className="group flex items-center gap-1.5"
            >
              <p className="font-display text-[18px] font-semibold">{name}</p>
              <Pencil
                size={14}
                strokeWidth={2.2}
                aria-hidden
                className="text-ink-faint transition-colors duration-120 group-hover:text-ink-soft"
              />
            </button>
          )}
        </div>
        {nameError ? (
          <p role="alert" className="mt-1 text-[11px] font-bold text-urgency-text">
            {nameError}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* No design-handoff mock for this control — it postdates the
            "Customize Mochi" frame, which only ever drew an accessory grid.
            Same two-state segmented-chip visual language `StoreBrowser`'s
            category chips already establish (`bg-terracotta` active, bordered
            inactive), but as a real tablist: unlike those chips, which filter
            one grid in place, these swap the whole grid/empty-state content
            below, so `tablist`/`tab`/`aria-selected` is the correct roles
            rather than `radiogroup`/`radio`. */}
        <div role="tablist" aria-label="Customize" className="mb-3 flex flex-none gap-[6px]">
          {(Object.keys(TAB_COPY) as CustomizeTab[]).map((key) => {
            const active = key === tab;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 rounded-pill px-3 py-[7px] text-[12px] transition-colors duration-120",
                  active
                    ? "bg-terracotta font-extrabold text-white"
                    : "border border-border-input bg-surface font-bold text-ink-soft hover:border-checkbox",
                )}
              >
                {TAB_COPY[key].label}
              </button>
            );
          })}
        </div>

        <p className="text-overline mb-[10px] flex-none text-ink-faint">{copy.heading}</p>

        {/* Grid always renders, even with nothing owned yet — the trailing
            dashed tile is then the only tile, same as `ZooPage`'s "Adopt
            another" slot at zero pets. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div role="radiogroup" aria-label={copy.label} className="grid grid-cols-3 gap-[9px] pb-2">
            {items.map((item) => {
              const isEquipped = item.id === equippedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={isEquipped}
                  // The tile's visible name is gone (below), so the item's
                  // own name has to reach a screen reader some other way —
                  // without this the radio's only content is `aria-hidden`
                  // art and it would announce as an unnamed option.
                  aria-label={item.storeItem.name}
                  disabled={equipping}
                  onClick={() => handleTap(item)}
                  className={cn(
                    // `aspect-square` + `overflow-hidden` and no padding: the
                    // art fills the frame edge to edge (user request,
                    // 2026-08-18), so the tile itself owns the dimensions and
                    // `ItemWell`'s `fill` stretches into them. The equipped
                    // state can no longer show through as a tint behind the
                    // art, so it reads as the border plus an inset ring
                    // instead — a ring rather than a thicker border because
                    // border-width changes would resize the art on select.
                    "relative aspect-square overflow-hidden rounded-[13px] border transition-colors duration-120",
                    isEquipped
                      ? "border-sage ring-1 ring-sage ring-inset"
                      : "border-border-track hover:border-checkbox",
                    equipping && "cursor-wait",
                  )}
                >
                  <ItemWell
                    item={item.storeItem}
                    size={44}
                    // Scaled up with the tile: the old 44px well showed its
                    // icon at 20px (~45% of the well), and these tiles are
                    // ~108px wide at the 3-column mobile grid, so a 20px
                    // glyph would read as a speck floating in a big frame.
                    iconSize={48}
                    animalIconSize={72}
                    rounded="rounded-none"
                    fill
                  />
                  {isEquipped ? (
                    <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-sage text-white">
                      <Check size={10} strokeWidth={3} aria-hidden />
                    </span>
                  ) : null}
                </button>
              );
            })}
            {/* Matches the item tiles' new square, label-less shape so the
                grid stays on one rhythm — its wording moves to `aria-label`
                the same way theirs did, leaving the dashed border and the
                "+" to carry the affordance. */}
            <Link
              href={`/store?category=${copy.storeCategory}`}
              aria-label={copy.addLabel}
              className="flex aspect-square items-center justify-center rounded-[13px] border-2 border-dashed border-checkbox text-ink-faint transition-colors duration-120 hover:border-ink-disabled hover:text-ink-soft"
            >
              <Plus size={32} strokeWidth={2.2} aria-hidden />
            </Link>
          </div>
        </div>

        {equipError ? (
          <p role="alert" className="mt-2 flex-none text-[11px] font-bold text-urgency-text">
            {equipError}
          </p>
        ) : null}
      </div>

      {achievementQueue[0] ? (
        <AchievementUnlockScreen
          key={achievementQueue[0].key}
          open
          achievement={achievementQueue[0]}
          onDismiss={() => setAchievementQueue((current) => current.slice(1))}
        />
      ) : levelUpQueue[0] ? (
        // Shown only once the achievement queue drains — same "one dialog at
        // a time" behaviour `LevelUpProvider`/`AchievementUnlockProvider`
        // each give for free; this component has neither, so it's ordered
        // by hand here instead.
        <LevelUpScreen
          key={`${levelUpQueue[0].from}-${levelUpQueue[0].to}-${levelUpQueue[0].xp}`}
          open
          level={levelUpQueue[0].to}
          previousLevel={levelUpQueue[0].from}
          onDismiss={() => setLevelUpQueue((current) => current.slice(1))}
        />
      ) : null}
    </AppShell>
  );
}

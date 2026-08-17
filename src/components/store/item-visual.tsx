import { Lock } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import Image from "next/image";

import type { StoreItem, StoreItemCategory } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";

/**
 * Shared per-category icon/label treatment, factored out of `StoreItemCard`
 * (STOR-01) when STOR-06's cart rows needed the exact same well — one
 * definition rather than the category→colour mapping drifting between two
 * copies.
 *
 * Category comparisons use the string literals ("FOOD", "ANIMALS", …) rather
 * than the `StoreItemCategory` enum's runtime object — this module is
 * reachable from client components (`StoreItemCard`, cart rows), and
 * importing anything but the *type* from `@/generated/prisma/client` pulls
 * Prisma's Node-only runtime into the browser bundle and breaks compilation
 * (the exact error STOR-02 hit and fixed).
 */

/**
 * Whether a `StoreItem.imageUrl` is a real art path (`/animals/koala.svg`,
 * `/backgrounds/river.svg`) rather than a lucide icon-name fallback for an
 * item with no artwork yet. Originally PRO-18's animal-only check
 * (`hasAnimalArt`) — the mapping's the same for every category, so this
 * generalized rather than growing a second copy once DECORATIONS items
 * started carrying real background art too. Exported so every place that
 * renders a pet's or item's own art directly (`AnimalCard`, `ZooGalleryCard`,
 * `PetCustomizer`'s stage — none of which go through `ItemWell`) can tell
 * the two apart the same way, rather than repeated `.startsWith("/")` checks.
 */
export function hasRealArt(imageUrl: string): boolean {
  return imageUrl.startsWith("/");
}

export const CATEGORY_LABEL: Record<StoreItemCategory, string> = {
  FOOD: "Food",
  ACCESSORIES: "Accessory",
  DECORATIONS: "Decoration",
  ANIMALS: "Animal",
};

const CATEGORY_WELL: Record<StoreItemCategory, { bg: string; icon: string }> = {
  FOOD: { bg: "bg-amber-tint", icon: "text-amber-text" },
  ACCESSORIES: { bg: "bg-sage-tint", icon: "text-sage-text" },
  DECORATIONS: { bg: "bg-violet-tint", icon: "text-violet-text" },
  // PRO-18 — no longer unused: animals without real artwork (see `isAnimal`
  // below) fall back to this same icon treatment, neutral rather than an
  // accent colour since animals don't otherwise carry a category tint.
  ANIMALS: { bg: "bg-input", icon: "text-ink-soft" },
};

/**
 * The icon well — category-tinted fill with either the item's lucide icon,
 * its animal artwork, or (STOR-04) a lock glyph on a desaturated fill.
 * `locked` is never true for a cart row (STOR-12 refuses to add a locked
 * item to the cart in the first place) but the card still needs it.
 *
 * `fullWidth` matters more than it looks: the mock's grid-card well
 * (STOR-01/04) sets a *height* but never a width, so it spans the card's
 * full inner width at that fixed height, with the icon centred *within
 * that width* — not a small fixed square sitting at the card's left edge,
 * which is what this rendered before `fullWidth` existed (found live: it
 * read as the icon stuck to the left rather than centred, and the animal
 * well's fill was much narrower than the template). The cart row (STOR-06)
 * is the one place the mock actually does draw a fixed square (`44×44`),
 * so that call site leaves `fullWidth` off.
 *
 * `bgClassNameOverride`/`iconClassNameOverride` (GACHA-14) let a caller tint
 * the well by something other than category — the Lucky Box reveal screen
 * colours it by the pulled item's *rarity* instead, and (unlike `locked`,
 * which swaps in a `Lock` glyph for a store card that can't be bought yet)
 * still shows the item's real icon, since a locked-but-owned pull is shown
 * with its own art plus a separate "unlocks at Lvl N" chip, not a padlock.
 * Optional and additive — every existing call site is unaffected.
 *
 * **PRO-18** — an animal no longer *requires* a real SVG. `seed.ts` used to
 * be limited to the 3 species with actual artwork in `public/animals/`
 * (Koala/Fox/Penguin) because this well rendered every `ANIMALS` item as
 * `next/image` unconditionally, and an item with no real file at its
 * `imageUrl` would 404 across the Store, Pet customizer and feed sheet. The
 * remaining 19 species (needed so "own every animal" achievements can
 * target the real 22, not 3) now seed with a lucide icon name instead of a
 * path — same "one shared icon, not literal artwork" precedent this file's
 * hat/tie rows already use — and this well tells the two apart by whether
 * `imageUrl` looks like a path or a bare icon name (`hasRealArt()`).
 *
 * That real-art-or-icon-fallback check isn't animal-specific any more: the
 * 16 `DECORATIONS` rows that carry real background art (`/backgrounds/...`,
 * added alongside PET-05's Backgrounds tab) render the same way here —
 * `showArt` only special-cases *sizing* by category (animal artwork wants
 * more room than a flat icon), not which category gets to show art at all.
 *
 * A decoration's art gets a different *treatment* from an animal's, though
 * (`fillArt`, at the user's request after seeing it live): an animal's SVG is
 * a standalone creature illustration, centred and contained at a fixed size
 * like the icon it replaces. A decoration's SVG is a small, seamlessly-
 * repeatable tile — centring a single copy of it inside the well read as
 * mostly-blank padding around one tiny swatch, not as the pattern. `fillArt`
 * instead paints it as the well's own tiled `background-image`
 * (`repeat`/an 18px tile), the same tiling treatment `backgroundImageStyle()`
 * gives a pet's stage panel in `src/lib/pet-mood.ts` (at a larger 44px tile,
 * since that panel is a lot bigger than this well) — not reused directly
 * from here since that module is pets-side and this is store-side, but the
 * same shape.
 */
export function ItemWell({
  item,
  locked = false,
  size,
  iconSize,
  animalIconSize = iconSize,
  rounded = "rounded-[11px]",
  fullWidth = false,
  className,
  bgClassNameOverride,
  iconClassNameOverride,
}: {
  item: Pick<StoreItem, "category" | "imageUrl">;
  locked?: boolean;
  /** Height always; also the fixed width when `fullWidth` is false. */
  size: number;
  /** Lucide icon size for goods; also the lock glyph size. */
  iconSize: number;
  /** Real art (animal *or* decoration) tends to want more room than a flat lucide icon does — defaults to `iconSize` if not given separately. */
  animalIconSize?: number;
  rounded?: string;
  /** Fixed height, but stretches to the container's width instead of a fixed square — the grid card's well, per the mock. */
  fullWidth?: boolean;
  className?: string;
  /** Replaces the default category-tinted fill. Ignored when `locked`. */
  bgClassNameOverride?: string;
  /** Replaces the default category-tinted icon colour (goods only — animal artwork has no tint to override). */
  iconClassNameOverride?: string;
}) {
  const isAnimal = item.category === "ANIMALS";
  const showArt = hasRealArt(item.imageUrl);
  // Only a *non-animal* real-art item (today: DECORATIONS) fills the well —
  // an animal's illustration stays centred/contained via the `<Image>` below.
  const fillArt = showArt && !isAnimal && !locked;

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullWidth ? "w-full" : "flex-none",
        rounded,
        locked
          ? "bg-[#E9E3D9]"
          // Real art (animal or decoration) sits on a neutral fill, same as
          // an art-less animal's icon well always has — only an icon
          // fallback for a *goods* category (food/accessories/an art-less
          // decoration like `Cosy den`) gets that category's tint. Moot for
          // `fillArt` either way, since the pattern paints over it, but kept
          // so the well isn't briefly the wrong colour while the image loads.
          : (bgClassNameOverride ?? (isAnimal || showArt ? "bg-input" : CATEGORY_WELL[item.category].bg)),
        className,
      )}
      style={{
        ...(fullWidth ? { height: size } : { width: size, height: size }),
        // Tiled, not stretched — same reasoning `backgroundImageStyle()` in
        // `src/lib/pet-mood.ts` documents for the pet stage's own background,
        // just a smaller repeat unit: these wells run as small as ~38px, and
        // that function's 44px tile would barely repeat once at that size.
        ...(fillArt ? { backgroundImage: `url(${item.imageUrl})`, backgroundSize: "18px", backgroundRepeat: "repeat" } : null),
      }}
    >
      {locked ? (
        <Lock size={iconSize} strokeWidth={2.2} className="text-ink-disabled" aria-hidden />
      ) : fillArt ? null : showArt ? (
        // Real art always gets `animalIconSize`'s larger treatment, not just
        // for `ANIMALS` — a decoration's background-pattern thumbnail is just
        // as cramped at flat-icon size as an animal's would be. Only the
        // fallback icon below stays category-scoped, since a bare lucide glyph
        // for a goods category was never meant to fill as much of the well.
        <Image
          src={item.imageUrl}
          alt=""
          width={animalIconSize}
          height={animalIconSize}
          className="block"
          style={{ width: animalIconSize, height: animalIconSize }}
        />
      ) : (
        <DynamicIcon
          // Free-form DB string (icon names for goods and art-less animals,
          // SVG paths for animals with real art) — cast rather than widen
          // `IconName`, same reasoning `feed-sheet.tsx` documents for its
          // own cast.
          name={item.imageUrl as IconName}
          size={isAnimal ? animalIconSize : iconSize}
          strokeWidth={2.2}
          className={
            isAnimal
              ? CATEGORY_WELL.ANIMALS.icon
              : (iconClassNameOverride ?? CATEGORY_WELL[item.category].icon)
          }
          aria-hidden
        />
      )}
    </div>
  );
}

import { Lock } from "lucide-react";
import type { IconName } from "lucide-react/dynamic";
import dynamic from "next/dynamic";
import Image from "next/image";

import type { StoreItem, StoreItemCategory } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import {
  ANIMAL_SHADOW,
  type ArtFocus,
  type ArtShadowSize,
  artCanvasFor,
  artFocusFor,
} from "@/lib/pet-art";

/**
 * #232 — lazily loaded, because `lucide-react/dynamic` carries a ~118KB
 * name→import map of every icon in the set, and a static import puts that
 * whole map in the initial client bundle of every route that renders a well
 * (the store grid, cart rows, the pet customizer, the zoo). It is only ever
 * *rendered* for an item whose `imageUrl` is a bare icon name rather than a
 * real art path — which the seeded catalogue no longer contains at all — so
 * on the store it was 60KB of chunk fetched to render nothing. Kept rather
 * than deleted: `imageUrl` is a free-form column, so an art-less row is still
 * a state this well has to draw. The type import above is erased at compile
 * time and pulls nothing in.
 *
 * `ssr` is left on: the fallback still has to server-render for the rows that
 * do use it, and only the chunk fetch is deferred.
 */
const DynamicIcon = dynamic(() =>
  import("lucide-react/dynamic").then((mod) => mod.DynamicIcon),
);

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
 * Whether a `StoreItem.imageUrl` is a real art path (`/animals/happy/koala.svg`,
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

/** The whole canvas, for art with no measured content box — see `ArtThumb`. */
const WHOLE_CANVAS: ArtFocus = { x: 0, y: 0, width: 1, height: 1 };

/**
 * One piece of the 2026-08-23 art pack, cropped to where its ink actually is
 * and fitted into a square.
 *
 * Every animal and accessory in that pack is drawn on the same 1080×1400
 * canvas so the two layer without adjustment (`src/lib/pet-art.ts`), which
 * leaves each file mostly empty — a hat lives in the top third, a collar in a
 * band near the bottom, the mandarin in about 2% of the file. Drawn whole in
 * a 44px well those are specks, so this zooms to the content box `ART_FOCUS`
 * records for the file. Thumbnails are the only place that's safe: there's no
 * second layer here to stay registered with, unlike `PetArt`, which must draw
 * both layers on the identical uncropped box or the hat slides off the head.
 *
 * The crop is expressed in percentages rather than pixels so the same markup
 * serves a fixed `size` and `ItemWell`'s `fill` mode, where the container's
 * pixel size isn't known at render time. The inner box carries the content
 * box's own aspect ratio, and the image inside it is blown up to
 * `100 / focus.width` of that box and pulled left/up by the content box's
 * offset — which works out to the full canvas scaled so that exactly the
 * content box shows through. No `overflow-hidden` is needed to hide the rest:
 * outside the content box the file is transparent by definition, and clipping
 * would cut the drop shadow off instead.
 *
 * `fill` assumes a square container (today: `PetCustomizer`'s `aspect-square`
 * tiles) — that's what makes "wide art takes the full width, tall art takes
 * the full height" equivalent to `object-contain`.
 */
function ArtThumb({
  imageUrl,
  size,
  shadow,
}: {
  imageUrl: string;
  /** Side of the square to fit the content box into. Omit to fill the (square) parent instead. */
  size?: number;
  shadow: ArtShadowSize;
}) {
  const focus = artFocusFor(imageUrl) ?? WHOLE_CANVAS;
  // Per-file, not the one animal canvas: the food pack is square, and reading
  // its focus box against the portrait canvas would letterbox every thumbnail.
  const canvas = artCanvasFor(imageUrl);
  const contentWidth = canvas.width * focus.width;
  const contentHeight = canvas.height * focus.height;
  const wide = contentWidth >= contentHeight;

  return (
    <div
      className={cn("flex items-center justify-center", size === undefined && "size-full")}
      style={size === undefined ? undefined : { width: size, height: size }}
    >
      <div
        className="relative"
        style={{
          aspectRatio: `${contentWidth} / ${contentHeight}`,
          width: wide ? "100%" : "auto",
          height: wide ? "auto" : "100%",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        <Image
          src={imageUrl}
          alt=""
          width={canvas.width}
          height={canvas.height}
          className={cn("absolute block max-w-none", ANIMAL_SHADOW[shadow])}
          style={{
            width: `${100 / focus.width}%`,
            height: `${100 / focus.height}%`,
            left: `${(-focus.x / focus.width) * 100}%`,
            top: `${(-focus.y / focus.height) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

export const CATEGORY_LABEL: Record<StoreItemCategory, string> = {
  FOOD: "Food",
  ACCESSORIES: "Accessory",
  DECORATIONS: "Decoration",
  ANIMALS: "Animal",
};

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Common",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
};

/**
 * The grid card's subtitle, per `design_handoff/ADDENDUM-store-zoo-art.md`'s
 * card spec ("Common food", "Rare animal") — rarity ahead of the existing
 * category label, lowercased so it reads as a phrase rather than two title-
 * cased words jammed together. Falls back to the bare category label for the
 * placeholder rows with no `rarity` yet (`schema.prisma`'s own "guessing a
 * rarity here would be fabricated data" note) — there's no rarity to prefix.
 */
export function itemSubtitle(item: Pick<StoreItem, "category" | "rarity">): string {
  const category = CATEGORY_LABEL[item.category];
  const rarity = item.rarity ? RARITY_LABEL[item.rarity] : null;
  return rarity ? `${rarity} ${category.toLowerCase()}` : category;
}

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
 * so that call site leaves `fullWidth` off. `fill` goes one step further and
 * stretches the well in both axes, for a container that already has its own
 * dimensions — `PetCustomizer`'s `aspect-square` tiles, where the user asked
 * for the item art to reach every edge of the frame (2026-08-18).
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
  fill = false,
  className,
  bgClassNameOverride,
  iconClassNameOverride,
}: {
  item: Pick<StoreItem, "category" | "imageUrl">;
  locked?: boolean;
  /** Height always; also the fixed width when `fullWidth` is false. Ignored entirely under `fill`. */
  size: number;
  /** Lucide icon size for goods; also the lock glyph size. */
  iconSize: number;
  /** Real art (animal *or* decoration) tends to want more room than a flat lucide icon does — defaults to `iconSize` if not given separately. */
  animalIconSize?: number;
  rounded?: string;
  /** Fixed height, but stretches to the container's width instead of a fixed square — the grid card's well, per the mock. */
  fullWidth?: boolean;
  /** Fills the parent in *both* axes, ignoring `size` — the customize grid's tiles, where the container (an `aspect-square` button) owns the dimensions and the art is meant to reach every edge of it. Wins over `fullWidth` if both are passed. */
  fill?: boolean;
  className?: string;
  /** Replaces the default category-tinted fill. Ignored when `locked`. */
  bgClassNameOverride?: string;
  /** Replaces the default category-tinted icon colour (goods only — animal artwork has no tint to override). */
  iconClassNameOverride?: string;
}) {
  const isAnimal = item.category === "ANIMALS";
  const showArt = hasRealArt(item.imageUrl);
  // Only a DECORATION's art fills the well: those files are seamless repeat
  // tiles, and one centred copy of a tile reads as a tiny swatch adrift in
  // padding rather than as the pattern. Every other category's art is a
  // cut-out illustration, centred and contained by `ArtThumb` below. This
  // used to be `!isAnimal`, which was the same thing right up until the
  // 2026-08-23 art pack gave ACCESSORIES real files too — left as-is, a
  // fedora would have been tiled across the well like wallpaper.
  const fillArt = showArt && item.category === "DECORATIONS" && !locked;

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fill ? "size-full" : fullWidth ? "w-full" : "flex-none",
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
        ...(fill ? null : fullWidth ? { height: size } : { width: size, height: size }),
        // Tiled, not stretched — same reasoning `backgroundImageStyle()` in
        // `src/lib/pet-mood.ts` documents for the pet stage's own background,
        // including *why* the tile has to be this big: each source SVG is
        // already a whole pre-repeated grid of the motif inside one
        // 1080×1080 file, not a single instance of it, so a small
        // `backgroundSize` just packs that existing grid tighter rather than
        // showing one big, legible shape. 18px → 32px → 56px → 150px
        // (2026-08-16/17, live feedback each round) — smaller than 150px,
        // individual motifs in these ~38-112px wells read as faint texture
        // rather than a recognisable shape.
        ...(fillArt ? { backgroundImage: `url(${item.imageUrl})`, backgroundSize: "150px", backgroundRepeat: "repeat" } : null),
      }}
    >
      {locked ? (
        <Lock size={iconSize} strokeWidth={2.2} className="text-ink-disabled" aria-hidden />
      ) : fillArt ? null : showArt ? (
        // Real art always gets `animalIconSize`'s larger treatment, not just
        // for `ANIMALS` — an accessory's cut-out is just as cramped at
        // flat-icon size as an animal's would be. Only the fallback icon
        // below stays category-scoped, since a bare lucide glyph for a goods
        // category was never meant to fill as much of the well.
        <ArtThumb
          imageUrl={item.imageUrl}
          size={fill ? undefined : animalIconSize}
          // A well big enough to want the larger lift gets it; the 26–44px
          // wells (purchase history, cart rows) would just smudge under it.
          shadow={animalIconSize >= 64 ? "card" : "thumb"}
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

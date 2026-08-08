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
  // Unused — animals render `Image` artwork instead, never this well's icon.
  ANIMALS: { bg: "bg-input", icon: "" },
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
  /** Animal artwork tends to want more room than a flat lucide icon does — defaults to `iconSize` if not given separately. */
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

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullWidth ? "w-full" : "flex-none",
        rounded,
        locked
          ? "bg-[#E9E3D9]"
          : (bgClassNameOverride ?? (isAnimal ? "bg-input" : CATEGORY_WELL[item.category].bg)),
        className,
      )}
      style={fullWidth ? { height: size } : { width: size, height: size }}
    >
      {locked ? (
        <Lock size={iconSize} strokeWidth={2.2} className="text-ink-disabled" aria-hidden />
      ) : isAnimal ? (
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
          // Free-form DB string (icon names for goods, SVG paths for
          // animals per `seed.ts`) — cast rather than widen `IconName`,
          // same reasoning `feed-sheet.tsx` documents for its own cast.
          name={item.imageUrl as IconName}
          size={iconSize}
          strokeWidth={2.2}
          className={iconClassNameOverride ?? CATEGORY_WELL[item.category].icon}
          aria-hidden
        />
      )}
    </div>
  );
}

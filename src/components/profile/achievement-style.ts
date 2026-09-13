import {
  Drumstick,
  Flame,
  Handshake,
  HouseHeart,
  PawPrint,
  Shirt,
  SquareCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import type { StoreItemRarity } from "@/generated/prisma/client";
import { rarityFamily } from "@/lib/rarity";

/**
 * Per-badge icon/colour, keyed on `Achievement.key` rather than stored on the
 * row — the catalogue is fixed in `prisma/seed.ts`, not user-configurable
 * data, so a lookup table is simpler than a schema column nothing else would
 * ever read. Shared between `AchievementsGrid`/the Achievements screen (the
 * earned/locked tile) and `AchievementUnlockScreen` (the unlock celebration)
 * so the two can never disagree about which icon or colour a badge is.
 *
 * PRO-18 — icons are `Achievements.pdf`'s own Lucide names verbatim (flame,
 * paw-print, house-heart, drumstick, shirt, trophy, square-check,
 * handshake — all confirmed to exist in this repo's `lucide-react`, no
 * substitutes needed). Colour is by category, reusing tokens already
 * established elsewhere rather than inventing new ones:
 *
 *   Streaks      → terracotta (this app's streak accent everywhere else)
 *   Tasks        → sage
 *   Petting Zoo  → violet
 *   Items        → tinted **by rarity**, read from `RARITY_FAMILY` in
 *                  `src/lib/rarity.ts` via {@link tierTile} (#276 —
 *                  previously this file and `lucky-box-home.tsx` each kept
 *                  their own copy of the same rarity→colour map, which is
 *                  exactly the drift UPDATE-01 is about) — an unlocked
 *                  "Epic Animal" badge reads the same colour family as an
 *                  Epic item does everywhere else in the app.
 *                  "Own every X" and "own everything" badges use the same
 *                  amber/Legendary tier as the hardest, rarest achievements
 *                  in this category.
 *
 * Colours are each accent's audited `-text` token, same reasoning
 * `StatsGrid`/`ItemWell` document — the mock's raw fills read fine as a
 * light background tint but fail contrast as the icon's own colour.
 * `week_warrior`-style streak badges use `text-terracotta` regardless — no
 * `terracotta-text` token exists, same accepted trade the "day streak" stat
 * tile and the persistent header's streak numeral already make (see
 * `globals.css`'s audit block).
 */
/**
 * #276 — a badge's tile colours, taken from the shared rarity family rather
 * than spelled out per badge. Identical output to the hand-written values
 * this replaced; the point is that there is now one place to change them.
 */
function tierTile(rarity: StoreItemRarity) {
  const family = rarityFamily(rarity);
  return { bg: family.tint, border: family.border, iconColor: family.text };
}

export const ACHIEVEMENT_STYLE: Record<
  string,
  { icon: LucideIcon; bg: string; border: string; iconColor: string }
> = {
  // Streaks — terracotta
  streak_5_day: { icon: Flame, bg: "bg-terracotta-tint", border: "border-terracotta/30", iconColor: "text-terracotta" },
  streak_7_day: { icon: Flame, bg: "bg-terracotta-tint", border: "border-terracotta/30", iconColor: "text-terracotta" },
  streak_14_day: { icon: Flame, bg: "bg-terracotta-tint", border: "border-terracotta/30", iconColor: "text-terracotta" },
  streak_30_day: { icon: Flame, bg: "bg-terracotta-tint", border: "border-terracotta/30", iconColor: "text-terracotta" },

  // Unlocks/Items — tinted by rarity
  unlock_common_animal: { icon: PawPrint, ...tierTile("COMMON") },
  unlock_common_decor: { icon: HouseHeart, ...tierTile("COMMON") },
  unlock_common_food: { icon: Drumstick, ...tierTile("COMMON") },
  unlock_common_accessory: { icon: Shirt, ...tierTile("COMMON") },
  unlock_rare_animal: { icon: PawPrint, ...tierTile("RARE") },
  unlock_rare_decor: { icon: HouseHeart, ...tierTile("RARE") },
  unlock_rare_food: { icon: Drumstick, ...tierTile("RARE") },
  unlock_rare_accessory: { icon: Shirt, ...tierTile("RARE") },
  unlock_epic_animal: { icon: PawPrint, ...tierTile("EPIC") },
  unlock_epic_decor: { icon: HouseHeart, ...tierTile("EPIC") },
  unlock_epic_food: { icon: Drumstick, ...tierTile("EPIC") },
  unlock_epic_accessory: { icon: Shirt, ...tierTile("EPIC") },
  unlock_legendary_animal: { icon: PawPrint, ...tierTile("LEGENDARY") },
  unlock_legendary_decor: { icon: HouseHeart, ...tierTile("LEGENDARY") },
  unlock_legendary_food: { icon: Drumstick, ...tierTile("LEGENDARY") },
  unlock_legendary_accessory: { icon: Shirt, ...tierTile("LEGENDARY") },
  unlock_all_animals: { icon: PawPrint, ...tierTile("LEGENDARY") },
  unlock_all_decor: { icon: HouseHeart, ...tierTile("LEGENDARY") },
  unlock_all_food: { icon: Drumstick, ...tierTile("LEGENDARY") },
  unlock_all_accessories: { icon: Shirt, ...tierTile("LEGENDARY") },
  unlock_everything: { icon: Trophy, ...tierTile("LEGENDARY") },

  // Tasks — sage
  tasks_3_in_day: { icon: SquareCheck, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  tasks_5_in_day: { icon: SquareCheck, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  tasks_10_in_day: { icon: SquareCheck, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  tasks_one_of_each: { icon: SquareCheck, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  tasks_10_trivial: { icon: SquareCheck, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  tasks_10_small: { icon: SquareCheck, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  tasks_10_medium: { icon: SquareCheck, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  tasks_10_large: { icon: SquareCheck, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  tasks_10_epic: { icon: SquareCheck, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },

  // Petting Zoo — violet
  zoo_pet_50: { icon: PawPrint, bg: "bg-violet-tint", border: "border-violet/30", iconColor: "text-violet-text" },
  zoo_feed_50: { icon: Drumstick, bg: "bg-violet-tint", border: "border-violet/30", iconColor: "text-violet-text" },
  zoo_best_friend: { icon: Handshake, bg: "bg-violet-tint", border: "border-violet/30", iconColor: "text-violet-text" },
  zoo_adopt_all: { icon: PawPrint, bg: "bg-violet-tint", border: "border-violet/30", iconColor: "text-violet-text" },
};

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
 *   Items        → tinted **by rarity**, replicating `lucky-box-home.tsx`'s
 *                  local `RARITY_STYLE` map (not importable — it's a
 *                  private const there, so repeated here verbatim, same as
 *                  `odds/page.tsx` already does with its own `RARITY_ROWS`)
 *                  — an unlocked "Epic Animal" badge reads the same colour
 *                  family as an Epic item does everywhere else in the app.
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
  unlock_common_animal: { icon: PawPrint, bg: "bg-input", border: "border-border-track", iconColor: "text-ink-soft" },
  unlock_common_decor: { icon: HouseHeart, bg: "bg-input", border: "border-border-track", iconColor: "text-ink-soft" },
  unlock_common_food: { icon: Drumstick, bg: "bg-input", border: "border-border-track", iconColor: "text-ink-soft" },
  unlock_common_accessory: { icon: Shirt, bg: "bg-input", border: "border-border-track", iconColor: "text-ink-soft" },
  unlock_rare_animal: { icon: PawPrint, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  unlock_rare_decor: { icon: HouseHeart, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  unlock_rare_food: { icon: Drumstick, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  unlock_rare_accessory: { icon: Shirt, bg: "bg-sage-tint", border: "border-sage/30", iconColor: "text-sage-text" },
  unlock_epic_animal: { icon: PawPrint, bg: "bg-violet-tint", border: "border-violet/30", iconColor: "text-violet-text" },
  unlock_epic_decor: { icon: HouseHeart, bg: "bg-violet-tint", border: "border-violet/30", iconColor: "text-violet-text" },
  unlock_epic_food: { icon: Drumstick, bg: "bg-violet-tint", border: "border-violet/30", iconColor: "text-violet-text" },
  unlock_epic_accessory: { icon: Shirt, bg: "bg-violet-tint", border: "border-violet/30", iconColor: "text-violet-text" },
  unlock_legendary_animal: { icon: PawPrint, bg: "bg-amber-tint", border: "border-amber/30", iconColor: "text-amber-text" },
  unlock_legendary_decor: { icon: HouseHeart, bg: "bg-amber-tint", border: "border-amber/30", iconColor: "text-amber-text" },
  unlock_legendary_food: { icon: Drumstick, bg: "bg-amber-tint", border: "border-amber/30", iconColor: "text-amber-text" },
  unlock_legendary_accessory: { icon: Shirt, bg: "bg-amber-tint", border: "border-amber/30", iconColor: "text-amber-text" },
  unlock_all_animals: { icon: PawPrint, bg: "bg-amber-tint", border: "border-amber/30", iconColor: "text-amber-text" },
  unlock_all_decor: { icon: HouseHeart, bg: "bg-amber-tint", border: "border-amber/30", iconColor: "text-amber-text" },
  unlock_all_food: { icon: Drumstick, bg: "bg-amber-tint", border: "border-amber/30", iconColor: "text-amber-text" },
  unlock_all_accessories: { icon: Shirt, bg: "bg-amber-tint", border: "border-amber/30", iconColor: "text-amber-text" },
  unlock_everything: { icon: Trophy, bg: "bg-amber-tint", border: "border-amber/30", iconColor: "text-amber-text" },

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

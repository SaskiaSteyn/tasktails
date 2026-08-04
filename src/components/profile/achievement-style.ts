import { CheckSquare, Flame, ShoppingBag, Star, type LucideIcon } from "lucide-react";

/**
 * Per-badge icon/colour, keyed on `Achievement.key` rather than stored on the
 * row — the catalogue is a handful of entries fixed in `prisma/seed.ts`, not
 * user-configurable data, so a lookup table is simpler than a schema column
 * nothing else would ever read. Shared between `AchievementsGrid` (the
 * earned/locked tile) and `AchievementUnlockScreen` (the unlock celebration)
 * so the two can never disagree about which icon or colour a badge is.
 *
 * Colours are each accent's audited `-text` token, same reasoning as
 * `StatsGrid`/`ItemWell` — the mock's raw fills read fine as a light
 * background tint but fail contrast as the icon's own colour. `week_warrior`
 * uses `text-terracotta` regardless — no `terracotta-text` token exists, same
 * accepted trade the "day streak" stat tile and the persistent header's
 * streak numeral already make (see `globals.css`'s audit block).
 */
export const ACHIEVEMENT_STYLE: Record<
  string,
  { icon: LucideIcon; bg: string; border: string; iconColor: string }
> = {
  task_champion: {
    icon: CheckSquare,
    bg: "bg-sage-tint",
    border: "border-sage/30",
    iconColor: "text-sage-text",
  },
  rising_star: {
    icon: Star,
    bg: "bg-violet-tint",
    border: "border-violet/30",
    iconColor: "text-violet-text",
  },
  week_warrior: {
    icon: Flame,
    bg: "bg-terracotta-tint",
    border: "border-terracotta/30",
    iconColor: "text-terracotta",
  },
  first_purchase: {
    icon: ShoppingBag,
    bg: "bg-amber-tint",
    border: "border-amber/30",
    iconColor: "text-amber-text",
  },
};

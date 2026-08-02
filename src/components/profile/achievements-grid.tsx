import { CheckSquare, Flame, Lock, ShoppingBag, Star, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import type { AchievementWithState } from "@/lib/achievements";

/**
 * PRO-07 — the "ACHIEVEMENTS" row: one square tile per catalogue entry,
 * earned or locked. The mock draws exactly four tiles at equal width
 * (`flex:1` each), which is also PRO-09's whole catalogue — no scrolling or
 * overflow case to design for.
 *
 * Per-badge icon/colour is keyed on `Achievement.key` rather than stored on
 * the row — the catalogue is a handful of entries fixed in `prisma/seed.ts`,
 * not user-configurable data, so a lookup table here is simpler than a
 * schema column nothing else would ever read. An unrecognised key (a future
 * achievement added without updating this map) falls back to a neutral tile
 * rather than crashing.
 *
 * Colours are each accent's audited `-text` token for the icon, same
 * reasoning as `StatsGrid` and `ItemWell` — the mock's raw fills read fine
 * as a light background tint but fail contrast as the icon's own colour.
 * Locked tiles reuse the dashed-placeholder treatment already established
 * this session (`AvatarUpload`, and `EmptyTasksState`/`CartPanel` before
 * it), not the mock's literal `#F2EEE7`/`#B8AFA4`.
 */
const TILE_STYLE: Record<
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
    // No `terracotta-text` token exists — same accepted trade the "day
    // streak" stat tile and the persistent header's streak numeral already
    // make (see `globals.css`'s audit block).
    iconColor: "text-terracotta",
  },
  first_purchase: {
    icon: ShoppingBag,
    bg: "bg-amber-tint",
    border: "border-amber/30",
    iconColor: "text-amber-text",
  },
};

export function AchievementsGrid({
  achievements,
}: {
  achievements: AchievementWithState[];
}) {
  return (
    <section>
      <p className="text-overline mb-[10px]">Achievements</p>
      <div className="flex gap-[9px]">
        {achievements.map((achievement) => {
          const unlocked = achievement.unlockedAt !== null;
          const style = TILE_STYLE[achievement.key];
          const Icon = style?.icon ?? Lock;

          return (
            <div
              key={achievement.id}
              role="img"
              aria-label={
                unlocked
                  ? `${achievement.name}: earned — ${achievement.description}`
                  : `${achievement.name}: locked — ${achievement.description}`
              }
              className={cn(
                "flex aspect-square flex-1 items-center justify-center rounded-[14px] border",
                unlocked
                  ? cn(style?.bg, style?.border)
                  : "border-dashed border-checkbox bg-input",
              )}
            >
              {unlocked ? (
                <Icon
                  size={22}
                  strokeWidth={2.2}
                  className={style?.iconColor}
                  aria-hidden
                />
              ) : (
                <Lock
                  size={18}
                  strokeWidth={2.2}
                  className="text-ink-disabled"
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

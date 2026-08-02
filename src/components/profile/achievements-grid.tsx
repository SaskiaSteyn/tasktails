import { Lock } from "lucide-react";

import { ACHIEVEMENT_STYLE } from "@/components/profile/achievement-style";
import { cn } from "@/lib/cn";
import type { AchievementWithState } from "@/lib/achievements";

/**
 * PRO-07 — the "ACHIEVEMENTS" row: one square tile per catalogue entry,
 * earned or locked. The mock draws exactly four tiles at equal width
 * (`flex:1` each), which is also PRO-09's whole catalogue — no scrolling or
 * overflow case to design for.
 *
 * Icon/colour per badge comes from `ACHIEVEMENT_STYLE` (shared with
 * `AchievementUnlockScreen`, so the tile and the celebration never
 * disagree). An unrecognised key (a future achievement added without
 * updating that map) falls back to a neutral tile rather than crashing.
 *
 * Locked tiles reuse the dashed-placeholder treatment already established
 * this session (`AvatarUpload`, and `EmptyTasksState`/`CartPanel` before
 * it), not the mock's literal `#F2EEE7`/`#B8AFA4`.
 */
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
          const style = ACHIEVEMENT_STYLE[achievement.key];
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

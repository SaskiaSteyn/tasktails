import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";

import { ACHIEVEMENT_STYLE } from "@/components/profile/achievement-style";
import { cn } from "@/lib/cn";
import type { AchievementWithState } from "@/lib/achievements";

/**
 * PRO-07 — the "ACHIEVEMENTS" row: one square tile per entry, earned or
 * locked. The mock draws exactly four tiles at equal width (`flex:1` each) —
 * true of PRO-09's original 4-achievement catalogue, but PRO-18 grew that to
 * 38, so this component now always renders whatever it's handed as a
 * **preview slice**, not the whole catalogue; the caller (`/profile`) is
 * responsible for slicing to 4.
 *
 * PRO-18 — the header gained a "See all ›" link per
 * `design_handoff/ADDENDUM-achievements.md`: the 4-tile strip below is
 * otherwise unchanged, only its header row and what feeds it changed.
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
      <div className="mb-[10px] flex items-center justify-between">
        <p className="text-overline">Achievements</p>
        <Link
          href="/profile/achievements"
          className="flex items-center gap-0.5 text-[11px] font-extrabold text-terracotta"
        >
          See all
          <ChevronRight size={13} strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
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

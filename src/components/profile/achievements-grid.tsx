import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";

import { ACHIEVEMENT_STYLE } from "@/components/profile/achievement-style";
import { cn } from "@/lib/cn";
import type { AchievementWithState } from "@/lib/achievements";

/**
 * PRO-07 — the "ACHIEVEMENTS" row: one square tile per entry, earned or
 * locked. The mock draws exactly four tiles at equal width (`flex:1` each) —
 * true of PRO-09's original 4-achievement catalogue, but PRO-18 grew that to
 * 38, so this component always renders whatever it's handed as a **preview
 * slice**, not the whole catalogue; the caller (`/profile`) does the slicing.
 *
 * PRO-18 — the header gained a "See all ›" link per
 * `design_handoff/ADDENDUM-achievements.md`.
 *
 * **Two changes on the user's direction (2026-08-30)**, both of them past
 * what the handoff draws:
 *
 *  1. **The strip fills the width.** The phone frame keeps its four tiles;
 *     `desk:` shows eight and `xl:` twelve, so the row is full at every width
 *     instead of four tiles stretched across a desktop. Extra tiles are
 *     `hidden` rather than sliced per breakpoint — one list, one DOM, no
 *     server-side guess at the viewport.
 *  2. **The badge name sits under the icon**, at both widths. That is why the
 *     tile is no longer icon-only: `line-clamp-2` keeps a long name like
 *     "Fully Accessorised" from pushing the square out of shape at the ~85px
 *     a phone gives each tile.
 *
 * A hover tooltip carrying the description was built here and then removed on
 * the user's direction the same day. Nothing is lost to assistive tech either
 * way: the tile's `aria-label` has always read name, state *and* description.
 * The full text lives one click away on `/profile/achievements`.
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
      <div className="flex gap-[9px] desk:gap-3">
        {achievements.map((achievement, index) => {
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
                "flex aspect-square flex-1 flex-col items-center justify-center gap-[6px] rounded-[14px] border p-2",
                // Four tiles on a phone, eight from `desk:`, twelve from
                // `xl:` — see the note above.
                index >= 8 ? "hidden xl:flex" : index >= 4 ? "hidden desk:flex" : null,
                unlocked
                  ? cn(style?.bg, style?.border)
                  : "border-dashed border-checkbox bg-input",
              )}
            >
              {unlocked ? (
                <Icon
                  size={22}
                  strokeWidth={2.2}
                  className={cn("flex-none", style?.iconColor)}
                  aria-hidden
                />
              ) : (
                <Lock
                  size={18}
                  strokeWidth={2.2}
                  className="flex-none text-ink-disabled"
                  aria-hidden
                />
              )}

              <span
                aria-hidden
                className={cn(
                  "line-clamp-2 text-center text-[9px] leading-[1.2] font-bold text-balance desk:text-[10.5px]",
                  unlocked ? "text-ink" : "text-ink-disabled",
                )}
              >
                {achievement.name}
              </span>

            </div>
          );
        })}
      </div>
    </section>
  );
}

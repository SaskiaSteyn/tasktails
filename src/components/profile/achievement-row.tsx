import { Check, Lock } from "lucide-react";

import { ACHIEVEMENT_STYLE } from "@/components/profile/achievement-style";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
import type { AchievementWithState } from "@/lib/achievements";

/**
 * PRO-18 — one row on the full Achievements screen
 * (`design_handoff/ADDENDUM-achievements.md`'s "Achievement row"), in its
 * three states: unlocked, locked, and locked-with-progress. Shared with
 * nothing else — `AchievementsGrid`'s Profile-preview tile is a different,
 * smaller layout the addendum keeps unchanged, not this row reused at a
 * different size.
 *
 * Icon/colour comes from `ACHIEVEMENT_STYLE`, same shared lookup
 * `AchievementsGrid`/`AchievementUnlockScreen` use, so a badge never reads
 * differently across the three places it can appear.
 */
export function AchievementRow({
  achievement,
}: {
  achievement: AchievementWithState;
}) {
  const unlocked = achievement.unlockedAt !== null;
  const style = ACHIEVEMENT_STYLE[achievement.key];
  const Icon = style?.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-[11px] rounded-[13px] border px-3 py-[10px]",
        unlocked
          ? "border-border-track bg-surface"
          : "border-[#ECE4D7] bg-warm",
      )}
    >
      <div
        className={cn(
          "flex size-10 flex-none items-center justify-center rounded-[12px]",
          unlocked
            ? cn(style?.bg, "border", style?.border)
            : "border border-dashed border-checkbox bg-input",
        )}
      >
        {unlocked && Icon ? (
          <Icon size={19} strokeWidth={2.2} className={style?.iconColor} aria-hidden />
        ) : (
          <Lock size={16} strokeWidth={2.2} className="text-ink-disabled" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-display text-[13.5px] font-semibold",
            unlocked ? "text-ink" : "text-ink-disabled",
          )}
        >
          {achievement.name}
        </p>
        <p
          className={cn(
            "mt-0.5 truncate text-[10.5px]",
            unlocked ? "text-ink-soft" : "text-ink-disabled",
          )}
        >
          {achievement.description}
        </p>

        {!unlocked && achievement.progress ? (
          <div className="mt-[7px] flex items-center gap-[7px]">
            <ProgressBar
              value={(achievement.progress.current / achievement.progress.target) * 100}
              tone="neutral"
              size="sm"
              className="flex-1"
              label={`${achievement.name} progress`}
              valueText={`${achievement.progress.current} of ${achievement.progress.target}`}
            />
            <span className="flex-none text-[9px] font-extrabold text-ink-disabled">
              {achievement.progress.current}/{achievement.progress.target}
            </span>
          </div>
        ) : null}
      </div>

      {unlocked ? (
        <Check size={18} strokeWidth={2.4} className="flex-none text-sage" aria-hidden />
      ) : null}
    </div>
  );
}

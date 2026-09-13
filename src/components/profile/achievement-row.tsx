import { Check, Lock } from "lucide-react";

import { ACHIEVEMENT_STYLE } from "@/components/profile/achievement-style";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
import type { AchievementWithState } from "@/lib/achievements";

/**
 * PRO-18 — one row on the full Achievements screen
 * (`design_handoff/ADDENDUM-achievements.md`'s "Achievement row"), in its
 * three states: unlocked, locked, and locked-with-progress.
 *
 * #283 — a locked row's text used to be `ink-disabled`, which measured
 * 1.99 BPCA on this card's `bg-warm`: nowhere near the 4.5 body text
 * needs, and the reason the row was unreadable rather than merely quiet.
 * Its name and description are now `ink-soft` (6.56) and the padlock
 * `ink-faint` (4.33, clearing the 3:1 that non-text content needs).
 *
 * It still reads as locked, because the state was never carried by the
 * dimness: the padlock in place of the badge icon, the dashed tile against
 * a filled coloured one, the missing sage check, and the warm card fill
 * against the unlocked row's white all say it. The name also stays a step
 * below an unlocked one (`ink-soft` against `ink`), so the hierarchy
 * survives — what changed is that "quieter" no longer means "illegible".
 *
 * Nothing here is `disabled` or `aria-hidden`: the row is a plain `div`
 * with real text, so a screen reader reads a locked achievement exactly as
 * it reads an earned one.
 *
 * Shared with
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
          <Icon
            size={19}
            strokeWidth={2.2}
            className={style?.iconColor}
            aria-hidden
          />
        ) : (
          <Lock
            size={16}
            strokeWidth={2.2}
            className="text-ink-faint"
            aria-hidden
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-display text-[13.5px] font-semibold",
            unlocked ? "text-ink" : "text-ink-soft",
          )}
        >
          {achievement.name}
        </p>
        <p className={cn("mt-0.5 truncate text-[10.5px]", "text-ink-soft")}>
          {achievement.description}
        </p>

        {!unlocked && achievement.progress ? (
          <div className="mt-[7px] flex items-center gap-[7px]">
            <ProgressBar
              value={
                (achievement.progress.current / achievement.progress.target) *
                100
              }
              tone="neutral"
              size="sm"
              className="flex-1"
              label={`${achievement.name} progress`}
              valueText={`${achievement.progress.current} of ${achievement.progress.target}`}
            />
            <span className="flex-none text-[9px] font-extrabold text-ink-soft">
              {achievement.progress.current}/{achievement.progress.target}
            </span>
          </div>
        ) : null}
      </div>

      {unlocked ? (
        <Check
          size={18}
          strokeWidth={2.4}
          className="flex-none text-sage"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

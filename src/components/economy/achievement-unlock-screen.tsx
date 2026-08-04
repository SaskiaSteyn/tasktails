"use client";

import { Trophy } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { ACHIEVEMENT_STYLE } from "@/components/profile/achievement-style";
import { Confetti } from "@/components/economy/confetti";
import { cn } from "@/lib/cn";

/**
 * The achievement-unlock celebration — same visual language as ECO-07's
 * `LevelUpScreen` (full-bleed dialog, confetti, medallion, single CTA), at
 * the user's request after noticing PRO-07's grid just silently flips a
 * tile with no moment marking it. No frame in `design_handoff` draws this —
 * achievement unlocking has no addendum the way level-up does — so it's
 * built by adapting the shipped level-up screen rather than inventing a new
 * visual language.
 *
 * Violet, not terracotta: level-up already owns terracotta as "the accent
 * that means XP/level", and violet is this app's existing accent for
 * achievement/award iconography (`Rising Star`'s tile, the level disc, the
 * "on-brand" reward-tile treatment) — reusing it here keeps the celebration
 * legible as a *different* kind of event from a level crossing, not a
 * reskin of the same one.
 *
 * ACCESSIBILITY — same BPCA-documented-exception approach `LevelUpScreen`
 * takes, reusing figures already measured for the violet token elsewhere in
 * this app rather than inventing a new exception category:
 *
 *     white on violet      — title 26px      3.79 BPCA (LevelBadge's disc)
 *     brand-soft on violet — overline/sub    3.09
 *     violet on white      — button          3.50 (better than the already-
 *                                             shipped terracotta button's 2.69)
 *
 * Confetti swaps its `violet` piece for terracotta (`Confetti`'s `tones`
 * prop) — violet confetti would vanish against a violet ground.
 */
export type AchievementUnlockLike = {
  key: string;
  name: string;
  description: string;
};

const CONFETTI_TONES = { violet: "bg-terracotta" };

export function AchievementUnlockScreen({
  open,
  achievement,
  onDismiss,
}: {
  open: boolean;
  achievement: AchievementUnlockLike;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const Icon = ACHIEVEMENT_STYLE[achievement.key]?.icon ?? Trophy;

  return (
    <dialog
      ref={ref}
      onClose={onDismiss}
      aria-labelledby={titleId}
      style={{ "--focus-ring": "#fff" } as React.CSSProperties}
      className={cn(
        "m-0 max-h-none max-w-none border-0 bg-violet p-0 text-white",
        "h-dvh w-dvw overflow-hidden",
        "frame:m-auto frame:h-[640px] frame:w-[var(--container-app)] frame:rounded-frame",
        "backdrop:bg-scrim",
        "[&_:focus-visible]:shadow-[0_0_0_5px_rgb(46_42_38/0.45)]",
      )}
    >
      <div className="relative flex h-full flex-col items-center px-6 pt-[70px] pb-8">
        <Confetti tones={CONFETTI_TONES} />

        <p className="relative text-[12px] font-extrabold tracking-[2px] text-brand-soft">
          ACHIEVEMENT UNLOCKED!
        </p>

        {/* Medallion — same 150px ring / 122px disc as the level-up screen,
            holding the badge's own icon instead of a level numeral. */}
        <div className="relative mt-5 flex size-[150px] flex-none items-center justify-center rounded-full bg-white/16 motion-safe:animate-medallion-pop">
          <div className="flex size-[122px] flex-col items-center justify-center rounded-full bg-surface shadow-[0_10px_24px_rgb(46_42_38/0.2)]">
            <Icon size={48} strokeWidth={2} className="text-violet" aria-hidden />
          </div>
        </div>

        <h1
          id={titleId}
          className="relative mt-6 text-center font-display text-[26px] font-semibold text-white"
        >
          {achievement.name}!
        </h1>

        <p className="relative mt-2 text-center text-[13.5px] leading-[1.5] text-brand-soft">
          {achievement.description}
        </p>

        <div className="relative mt-auto flex w-full flex-col items-center gap-3 pt-8">
          <button
            type="button"
            onClick={onDismiss}
            autoFocus
            className={cn(
              "flex h-[50px] w-full items-center justify-center rounded-btn font-display text-[16px] font-semibold",
              "bg-surface text-violet shadow-[0_6px_14px_rgb(46_42_38/0.18)] transition-all duration-120 ease-out",
              "hover:bg-warm hover:-translate-y-px active:bg-input active:translate-y-px",
            )}
          >
            Continue
          </button>
        </div>
      </div>
    </dialog>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * The level-up celebration (ECO-07), built to `design_handoff/ADDENDUM-levelup.md`.
 *
 * Full-bleed terracotta, edge to edge — the addendum is explicit that this is
 * *not* a card on a scrim. It is still a `<dialog>`, because it takes over the
 * screen and everything behind it should be inert: focus trapping, Escape and
 * the background `inert` all come from the platform rather than a hand-rolled
 * focus manager, exactly as `Modal` does it.
 *
 * ACCESSIBILITY — a terracotta background is the one surface in this palette
 * where nothing reaches 3:1 (see the `--focus-ring` caveat in globals.css).
 * Everything here is therefore a documented AA exception, drawn as designed and
 * consistent with the white-on-terracotta buttons already accepted:
 *
 *     white on terracotta      — title 26px       2.86 BPCA
 *     #FBE3D8 on terracotta    — overline/sub     2.54
 *     terracotta on white      — button, numeral  2.69
 *     white on the 16% tile    — reward value     2.40
 *
 * What is *not* left as-is is the focus ring: globals.css asks any container on
 * a saturated fill to set `--focus-ring` itself, so this one switches it to
 * white and adds a dark halo underneath. Two-tone is the only thing that stays
 * visible against both the terracotta ground and the white button sitting on it.
 */

export type LevelUpReward = {
  icon: LucideIcon;
  /** The headline value — "+150 bonus coins", "Star hat". */
  value: string;
  /** The small caption beneath it. */
  label: string;
};

/**
 * Confetti, fixed rather than random.
 *
 * Deterministic because the component renders on the server first: `Math.random`
 * would place the pieces differently on the client and React would throw a
 * hydration mismatch. Sizes, angles and colours are the addendum's — 7–9px,
 * 12–40°, amber / violet / sage / cream, upper half only.
 */
const CONFETTI = [
  { left: 8, top: 6, size: 8, rotate: 24, tone: "amber", round: false, delay: 0 },
  { left: 22, top: 14, size: 7, rotate: 0, tone: "violet", round: true, delay: 0.18 },
  { left: 35, top: 4, size: 9, rotate: 38, tone: "sage", round: false, delay: 0.07 },
  { left: 48, top: 17, size: 7, rotate: 12, tone: "cream", round: false, delay: 0.3 },
  { left: 61, top: 7, size: 8, rotate: 0, tone: "amber", round: true, delay: 0.12 },
  { left: 74, top: 15, size: 7, rotate: 31, tone: "violet", round: false, delay: 0.24 },
  { left: 88, top: 5, size: 9, rotate: 18, tone: "sage", round: false, delay: 0.04 },
  { left: 14, top: 27, size: 7, rotate: 0, tone: "cream", round: true, delay: 0.34 },
  { left: 29, top: 34, size: 8, rotate: 40, tone: "amber", round: false, delay: 0.15 },
  { left: 55, top: 31, size: 7, rotate: 21, tone: "sage", round: false, delay: 0.27 },
  { left: 68, top: 38, size: 8, rotate: 0, tone: "violet", round: true, delay: 0.09 },
  { left: 82, top: 29, size: 7, rotate: 15, tone: "cream", round: false, delay: 0.21 },
  { left: 43, top: 44, size: 7, rotate: 33, tone: "amber", round: false, delay: 0.36 },
  { left: 95, top: 40, size: 7, rotate: 0, tone: "sage", round: true, delay: 0.2 },
] as const;

const CONFETTI_TONES: Record<string, string> = {
  amber: "bg-amber-ring",
  violet: "bg-violet",
  sage: "bg-sage",
  cream: "bg-brand-soft",
};

function Confetti() {
  return (
    // Decorative only — never announced. The celebration is carried by the
    // heading, which screen readers get instead.
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 overflow-hidden">
      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          className={cn(
            "absolute motion-safe:animate-confetti-fall",
            piece.round ? "rounded-full" : "rounded-[1px]",
            CONFETTI_TONES[piece.tone],
          )}
          style={{
            left: `${piece.left}%`,
            top: `${piece.top}%`,
            width: piece.size,
            height: piece.size,
            transform: `rotate(${piece.rotate}deg)`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function LevelUpScreen({
  open,
  level,
  previousLevel,
  title,
  subtitle,
  rewards = [],
  primaryLabel,
  onPrimary,
  onDismiss,
}: {
  open: boolean;
  /** The level just reached — the medallion numeral. */
  level: number;
  /** Where they came from. Only used when more than one level was crossed. */
  previousLevel?: number;
  title?: string;
  subtitle?: string;
  /** One tile each. The row is hidden entirely when empty (addendum). */
  rewards?: LevelUpReward[];
  primaryLabel?: string;
  onPrimary?: () => void;
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

  const climbed = previousLevel !== undefined && level - previousLevel > 1;

  // The addendum's two actions only make sense when there is something to
  // claim: "Claim rewards" over "Keep going" is a choice about a payout. This
  // economy grants no level-up payout (Requirements §3 defines none), so with an
  // empty tile row the screen collapses to one action rather than offering the
  // same dismissal twice under two names — and never promises a reward that
  // does not exist, which matters more than usual in a deception study.
  const hasRewards = rewards.length > 0;
  const primary = primaryLabel ?? (hasRewards ? "Claim rewards" : "Continue");

  return (
    <dialog
      ref={ref}
      onClose={onDismiss}
      aria-labelledby={titleId}
      style={{ "--focus-ring": "#fff" } as React.CSSProperties}
      className={cn(
        // Full-bleed on a phone; from `frame:` up it takes the shape of the app
        // card it is celebrating inside, the same 400×640 frame AppShell draws.
        // Explicit heights on both sides rather than `h-full` + `h-auto`: the
        // dialog's own box is what the inner `min-h-full` resolves against, and
        // an `auto` height there is circular.
        "m-0 max-h-none max-w-none border-0 bg-terracotta p-0 text-white",
        "h-dvh w-dvw overflow-hidden",
        // Same 400px token AppShell's `max-w-app` uses — the container scale
        // only generates a max-width utility, so the width is read directly.
        "frame:m-auto frame:h-[640px] frame:w-[var(--container-app)] frame:rounded-frame",
        "backdrop:bg-scrim",
        // Two-tone focus ring — white outline (set above) plus a dark halo, so
        // it survives both the terracotta ground and the white button on it.
        "[&_:focus-visible]:shadow-[0_0_0_5px_rgb(46_42_38/0.45)]",
      )}
    >
      <div className="relative flex h-full flex-col items-center px-6 pt-[70px] pb-8">
        <Confetti />

        <p className="relative text-[12px] font-extrabold tracking-[2px] text-brand-soft">
          LEVEL UP!
        </p>

        {/* Medallion — 150px ring, white disc inset 14px. */}
        <div className="relative mt-5 flex size-[150px] flex-none items-center justify-center rounded-full bg-white/16 motion-safe:animate-medallion-pop">
          <div className="flex size-[122px] flex-col items-center justify-center rounded-full bg-surface shadow-[0_10px_24px_rgb(46_42_38/0.2)]">
            <span className="text-[11px] font-extrabold text-ink-soft">LEVEL</span>
            <span className="font-display text-[52px] leading-none font-semibold text-terracotta">
              {level}
            </span>
          </div>
        </div>

        <h1
          id={titleId}
          className="relative mt-6 text-center font-display text-[26px] font-semibold text-white"
        >
          {title ?? `You reached Level ${level}!`}
        </h1>

        <p className="relative mt-2 text-center text-[13.5px] leading-[1.5] text-brand-soft">
          {subtitle ??
            (climbed
              ? `You climbed all the way from Level ${previousLevel}. Your little zoo is growing.`
              : "Your little zoo is growing. Keep the streak alive.")}
        </p>

        {hasRewards ? (
          <ul className="relative mt-6 flex w-full gap-[10px]">
            {rewards.map((reward) => (
              <li
                key={`${reward.value}-${reward.label}`}
                className="flex flex-1 flex-col items-center gap-[6px] rounded-[14px] bg-white/16 px-2 py-3 text-center"
              >
                <span className="flex size-[30px] items-center justify-center rounded-full bg-surface text-terracotta">
                  <reward.icon size={16} strokeWidth={2.2} aria-hidden />
                </span>
                <span className="font-display text-[16px] font-semibold text-white">
                  {reward.value}
                </span>
                <span className="text-[10px] font-bold text-brand-soft">
                  {reward.label}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="relative mt-auto flex w-full flex-col items-center gap-3 pt-8">
          <Button
            size="hero"
            variant="on-brand"
            onClick={onPrimary ?? onDismiss}
            autoFocus
          >
            {primary}
          </Button>

          {hasRewards ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-chip px-2 py-1 text-[13px] font-bold text-brand-soft"
            >
              Keep going
            </button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

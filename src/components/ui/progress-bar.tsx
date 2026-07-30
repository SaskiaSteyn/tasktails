import { cn } from "@/lib/cn";

/**
 * Progress bar — track `border-track`, height 8, radius 5 (style guide).
 *
 * The fill colour is semantic, not decorative: violet is XP, sage is happiness,
 * amber is hunger, sage again for an onboarding quest. Passing a tone rather
 * than a class keeps those fixed — a sage XP bar would read as "good" on a
 * screen where the sage bar already means something else. `goal` and
 * `happiness` land on the same sage on purpose; they are named separately so a
 * later change to either doesn't drag the other with it.
 *
 * Built once here because the sanctuary (ZOO-01) draws two of these beside the
 * header's one.
 */
export type ProgressTone = "xp" | "happiness" | "hunger" | "goal";

/** The designs draw two heights: 8px in the header, 7px on a quest card. */
export type ProgressSize = "default" | "sm";

const tones: Record<ProgressTone, string> = {
  xp: "bg-violet",
  happiness: "bg-sage",
  hunger: "bg-amber",
  goal: "bg-sage",
};

const heights: Record<ProgressSize, string> = {
  default: "h-2",
  sm: "h-[7px]",
};

export function ProgressBar({
  value,
  tone = "xp",
  size = "default",
  label,
  valueText,
  className,
}: {
  /** 0-100. Clamped, so an out-of-range value can't overflow the track. */
  value: number;
  tone?: ProgressTone;
  size?: ProgressSize;
  /** Accessible name — required, since the fill colour is the only other cue. */
  label: string;
  /** What assistive tech announces instead of a bare percentage, e.g. "7 of 20 XP". */
  valueText?: string;
  className?: string;
}) {
  const percent = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
      className={cn(
        "overflow-hidden rounded-[5px] bg-border-track",
        heights[size],
        className,
      )}
    >
      <div
        className={cn("h-full rounded-[5px] transition-[width] duration-300 ease-out", tones[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

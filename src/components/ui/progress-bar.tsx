import { cn } from "@/lib/cn";

/**
 * Progress bar — track `border-track`, height 8, radius 5 (style guide).
 *
 * The fill colour is semantic, not decorative: violet is XP, sage is happiness,
 * amber is hunger. Passing a tone rather than a class keeps those three fixed —
 * a sage XP bar would read as "good" on a screen where the sage bar already
 * means something else.
 *
 * Built once here because the sanctuary (ZOO-01) draws two of these beside the
 * header's one.
 */
export type ProgressTone = "xp" | "happiness" | "hunger";

const tones: Record<ProgressTone, string> = {
  xp: "bg-violet",
  happiness: "bg-sage",
  hunger: "bg-amber",
};

export function ProgressBar({
  value,
  tone = "xp",
  label,
  valueText,
  className,
}: {
  /** 0-100. Clamped, so an out-of-range value can't overflow the track. */
  value: number;
  tone?: ProgressTone;
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
        "h-2 overflow-hidden rounded-[5px] bg-border-track",
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

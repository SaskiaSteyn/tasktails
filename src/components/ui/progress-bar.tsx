import { cn } from "@/lib/cn";

/**
 * Progress bar — track `border-track`, height 8, radius 5 (style guide).
 *
 * The fill colour is semantic, not decorative. `xp` and `goal` are *fixed* —
 * violet always means XP, sage always means an onboarding quest — so a later
 * screen can't accidentally reuse a colour that already means something else
 * there.
 *
 * `good`/`caution`/`critical` are different: they're a *value-driven* traffic
 * light (sage/amber/terracotta), for a meter whose own fill level is the
 * thing being judged — PET-02's happiness/hunger bars, per
 * `design_handoff/ADDENDUM-zoo-gallery.md`'s colour rule ("the icon stroke
 * ALWAYS matches its own bar fill... healthy = green, caution = amber,
 * critical = terracotta"). The caller picks which of the three applies (see
 * `stateTone()` in `src/lib/pet-mood.ts`) rather than this component reading
 * `value` itself, since "which direction is good" depends on the stat — high
 * happiness is good, high hunger is not, and this component has no way to
 * know which it's drawing. Terracotta rather than literal red: `--color-
 * urgency` is reserved for Group B's false-urgency stimuli and destructive
 * actions (AGENTS.md) and must never appear in neutral game UI like this.
 *
 * Built once here because the sanctuary (ZOO-01) draws two of these beside the
 * header's one.
 */
export type ProgressTone = "xp" | "goal" | "good" | "caution" | "critical";

/** The designs draw two heights: 8px in the header, 7px on a quest card. */
export type ProgressSize = "default" | "sm";

const tones: Record<ProgressTone, string> = {
  xp: "bg-violet",
  goal: "bg-sage",
  good: "bg-sage",
  caution: "bg-amber",
  critical: "bg-terracotta",
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

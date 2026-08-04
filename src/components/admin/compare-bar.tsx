import { cn } from "@/lib/cn";

/**
 * One labelled A/B row on the study overview card (ADM-05) — a leading "A"/"B"
 * glyph, a filled track, and a right-aligned value. Bespoke rather than a
 * `ProgressBar` variant: that component's tones are a value-driven traffic
 * light (good/caution/critical) or a fixed semantic colour (xp/goal), neither
 * of which fits "this bar is sage because it's Group A, that one is urgency-
 * red because it's Group B" — a per-row identity, not a judgement on the
 * number.
 *
 * `widthPercent` is the bar's own visual length, not a 0-100 value — the
 * design sizes each group's bar independently per metric (see the style
 * guide's own note that a wider bar doesn't always mean "better"), so the
 * caller picks it rather than this component normalising anything.
 */
export function CompareBar({
  group,
  value,
  widthPercent,
}: {
  group: "A" | "B";
  value: string;
  widthPercent: number;
}) {
  const isA = group === "A";

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "w-[18px] flex-none text-center text-[11px] font-extrabold",
          isA ? "text-sage-text" : "text-urgency-text",
        )}
      >
        {group}
      </span>
      <div className="h-4 flex-1 overflow-hidden rounded-[5px] bg-border-track">
        <div
          className={cn("h-full rounded-[5px]", isA ? "bg-sage" : "bg-urgency")}
          style={{ width: `${Math.min(100, Math.max(0, widthPercent))}%` }}
        />
      </div>
      <span className="w-12 flex-none text-right text-[12px] font-bold text-ink">
        {value}
      </span>
    </div>
  );
}

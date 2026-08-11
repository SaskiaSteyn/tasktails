import { cn } from "@/lib/cn";

/**
 * Level indicator (INF-12).
 *
 * The designs draw it two ways and both are used: a 34px filled violet disc with
 * a white label in the dashboard header, and a violet-tint pill in the compact
 * persistent-header spec. Same datum, different density, so one component.
 *
 * KNOWN AA GAP — `disc` puts white on `--color-violet` at 3.79 (BPCA), below the
 * 4.5:1 that 13px text needs. It is drawn exactly as the handoff specifies,
 * consistent with the terracotta and sage exceptions already recorded at the top
 * of globals.css. Flagged for the INF-14 pass to accept or fix; `pill` is the
 * ready-made alternative if it is fixed (violet-text on violet-tint, 4.59).
 */
export function LevelBadge({
  level,
  variant = "disc",
  className,
}: {
  level: number;
  variant?: "disc" | "pill";
  className?: string;
}) {
  return (
    <span
      // "Lv4" is a graphic abbreviation; screen readers get the whole word.
      // role="img" is what lets the label replace it.
      role="img"
      aria-label={`Level ${level}`}
      className={cn(
        "inline-flex flex-none items-center justify-center font-display font-semibold",
        variant === "disc"
          ? "size-[34px] rounded-full bg-violet text-[13px] text-white"
          : "rounded-pill bg-violet-tint px-[9px] py-1 text-[12px] font-extrabold text-violet-text",
        className,
      )}
    >
      Lv{level}
    </span>
  );
}

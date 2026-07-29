import { Flame } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Streak, drawn the two ways the designs use it (INF-12).
 *
 * `StreakPill` — terracotta-tint pill with a flame, for the compact header.
 * `StreakCard` — the dashboard's stat card sitting beside the XP bar.
 *
 * Both take the consecutive-day count from `UserEconomy.streak`. Neither uses
 * urgency red: a lapsing streak is a nudge the designs render in the brand
 * terracotta, and red is reserved for Group B (see globals.css).
 */

export function StreakPill({
  days,
  className,
}: {
  days: number;
  className?: string;
}) {
  return (
    // role="img" + label, because a flame and a bare digit do not read as a
    // streak on their own. A plain aria-label on a span is not reliably exposed.
    <span
      role="img"
      aria-label={`${days}-day streak`}
      className={cn(
        "inline-flex flex-none items-center gap-1 rounded-pill bg-terracotta-tint px-[9px] py-1 text-[12px] font-extrabold text-terracotta",
        className,
      )}
    >
      <Flame size={13} strokeWidth={2.2} aria-hidden className="flex-none" />
      {days}
    </span>
  );
}

export function StreakCard({
  days,
  className,
}: {
  days: number;
  className?: string;
}) {
  // No aria-label here — "5" above "DAY STREAK" already reads correctly, and
  // labelling it would only duplicate the text that is on screen.
  return (
    <div
      className={cn(
        "flex flex-none flex-col items-center justify-center rounded-input border border-border-track bg-surface px-3 py-2",
        className,
      )}
    >
      <span className="font-display text-[17px] leading-none font-semibold text-terracotta">
        {days}
      </span>
      <span className="text-[9px] font-bold tracking-[0.3px] text-ink-soft">
        DAY STREAK
      </span>
    </div>
  );
}

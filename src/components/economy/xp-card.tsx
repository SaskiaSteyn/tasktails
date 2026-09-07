import { ProgressBar } from "@/components/ui/progress-bar";
import type { EconomySnapshot } from "@/lib/economy";
import { cn } from "@/lib/cn";

/**
 * The XP card — caption, "into level / span" numerals, and the violet bar.
 *
 * The numerals are `xpIntoLevel / xpLevelSpan` rather than the mock's running
 * total against the next threshold, because the bar resets each level (INF-21).
 * The two have to agree: a bar at 35% next to "42 / 55 XP" would look broken.
 *
 * Lifted out of `app-header.tsx` (where it was private) so the Profile screen
 * can draw the same track under its own "Buy XP with coins" card — a
 * conversion with nowhere to land looked like it had done nothing. Both
 * callers pass a server-rendered `EconomySnapshot`, so `router.refresh()`
 * after a conversion re-renders this with the new `percent` and
 * `ProgressBar`'s own `transition-[width]` animates the fill.
 */
export function XpCard({
  economy,
  className,
}: {
  economy: EconomySnapshot;
  className?: string;
}) {
  const { isMaxLevel, nextLevel, xpIntoLevel, xpLevelSpan, percent } = economy;

  const caption = isMaxLevel ? "MAX LEVEL" : `XP TO LVL ${nextLevel}`;
  // Locale pinned explicitly, same reason `coin.tsx`'s CoinPill fixes —
  // `toLocaleString()` with no argument can format differently on the server
  // than in the browser and produce a hydration mismatch.
  const value = isMaxLevel
    ? `${economy.xp.toLocaleString("en-US")} XP`
    : `${xpIntoLevel} / ${xpLevelSpan} XP`;

  return (
    <div
      className={cn(
        "min-w-0 flex-1 rounded-input border border-border-track bg-surface px-[11px] py-2",
        className,
      )}
    >
      <div className="flex justify-between gap-2 text-[10.5px] font-bold text-ink-soft">
        <span className="truncate">{caption}</span>
        <span className="flex-none text-violet-text">{value}</span>
      </div>
      <ProgressBar
        className="mt-1.5"
        tone="xp"
        value={percent}
        label={caption === "MAX LEVEL" ? "XP progress" : `XP to level ${nextLevel}`}
        valueText={value}
      />
    </div>
  );
}

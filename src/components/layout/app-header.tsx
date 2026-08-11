import type { ReactNode } from "react";

import { CoinPill } from "@/components/ui/coin";
import { LevelBadge } from "@/components/ui/level-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StreakCard } from "@/components/ui/streak";
import { cn } from "@/lib/cn";
import type { EconomySnapshot } from "@/lib/economy";

/**
 * The persistent header (INF-12) — warm bar, track-coloured bottom border, on
 * every logged-in screen. The bottom nav, its other half, is SHR-01.
 *
 * The designs draw it in two densities and both ship:
 *
 *  - **greeting** (dashboard) — "Good morning / Nico" on the left, coin pill and
 *    level disc on the right, then a second row with the XP bar and the streak
 *    card. Omit `title` to get this.
 *  - **title** (store, sanctuary) — a screen title, an optional trailing control
 *    such as the store's history icon, and the coin pill. Pass `title`.
 *
 * Presentational on purpose: it takes a snapshot rather than fetching one, so it
 * can be rendered from a page that already loaded the economy, and so the style
 * guide can draw it at arbitrary values. `AppShell` is what wires it to the
 * database.
 */

export type AppHeaderProps = {
  /** Screen title. Omit for the greeting block. */
  title?: string;
  /** Who to greet — the handle from `displayNameFor()`. Greeting variant only. */
  name?: string;
  economy: EconomySnapshot;
  /**
   * The XP bar + streak row. On by default for the greeting variant, off for a
   * titled screen, matching where the designs draw it.
   */
  showProgress?: boolean;
  /** Trailing control in the right cluster, before the coin pill. */
  action?: ReactNode;
  /**
   * Heading level for `title`. The screen title is the page's `h1`, which is the
   * default and almost always right — override it only where the header is
   * embedded in a page that already has one, as the style guide's samples are
   * (INF-14: a second `h1` breaks the document outline).
   */
  titleAs?: "h1" | "h2";
  className?: string;
};

/**
 * "Good morning" / "Good afternoon" / "Good evening".
 *
 * Resolved in the study's timezone rather than the server's. This renders on the
 * server, so without pinning it the greeting would follow wherever the app
 * happens to be deployed — a UTC EC2 box would tell a Pretoria participant "good
 * evening" at 8pm local while it is still 6pm to the server. Participants are
 * all in one timezone, so one fixed zone is correct and, unlike reading the
 * browser clock, it cannot produce a hydration mismatch.
 */
const STUDY_TIME_ZONE = "Africa/Johannesburg";

export function greetingFor(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-ZA", {
      hour: "numeric",
      hour12: false,
      timeZone: STUDY_TIME_ZONE,
    }).format(now),
  );

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function AppHeader({
  title,
  name,
  economy,
  showProgress = !title,
  action,
  titleAs: Heading = "h1",
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        // The top inset is added to the design's 6px rather than replacing it,
        // so the warm bar itself extends under a notch and only its contents are
        // pushed clear (INF-13). Resolves to plain 6px everywhere else.
        "flex-none border-b border-border-track bg-warm px-[18px] pt-[14px] pb-[14px]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {title ? (
          <Heading className="min-w-0 truncate font-display text-[19px] leading-[1.15] font-semibold">
            {title}
          </Heading>
        ) : (
          <div className="min-w-0">
            <p className="text-[12px] text-ink-soft">{greetingFor()}</p>
            <p className="truncate font-display text-[19px] leading-none font-semibold">
              {name}
            </p>
          </div>
        )}

        <div className="flex flex-none items-center gap-2">
          {action}
          <CoinPill coins={economy.coins} />
          {title ? null : <LevelBadge level={economy.level} />}
        </div>
      </div>

      {showProgress ? (
        <div className="mt-3 flex gap-2">
          <XpCard economy={economy} />
          <StreakCard days={economy.streak} />
        </div>
      ) : null}
    </header>
  );
}

/**
 * The XP card — caption, "into level / span" numerals, and the violet bar.
 *
 * The numerals are `xpIntoLevel / xpLevelSpan` rather than the mock's running
 * total against the next threshold, because the bar resets each level (INF-21).
 * The two have to agree: a bar at 35% next to "42 / 55 XP" would look broken.
 */
function XpCard({ economy }: { economy: EconomySnapshot }) {
  const { isMaxLevel, nextLevel, xpIntoLevel, xpLevelSpan, percent } = economy;

  const caption = isMaxLevel ? "MAX LEVEL" : `XP TO LVL ${nextLevel}`;
  // Locale pinned explicitly, same reason `coin.tsx`'s CoinPill fixes —
  // `toLocaleString()` with no argument can format differently on the server
  // than in the browser and produce a hydration mismatch.
  const value = isMaxLevel
    ? `${economy.xp.toLocaleString("en-US")} XP`
    : `${xpIntoLevel} / ${xpLevelSpan} XP`;

  return (
    <div className="min-w-0 flex-1 rounded-input border border-border-track bg-surface px-[11px] py-2">
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

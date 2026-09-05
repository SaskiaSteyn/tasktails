import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * The header's rank indicator — the number, and a way into the leaderboard.
 *
 * Replaces `LevelBadge` on the home screen's header at the user's request
 * (2026-09-05): where the level number sat, the standing does, and tapping it
 * goes to `/profile/leaderboard` (the same destination `RankButton` on
 * Profile already leads to). `LevelBadge` itself stays — the level is still
 * carried by the XP card right below, which is what the bar is measuring.
 *
 * Amber, like every other rank surface in this app (`RankButton`, the
 * leaderboard's first place), rather than the level's violet — but the tint
 * fill with `amber-text` on it, not the `bg-amber` + white the podium uses:
 * white on amber measures 2.05 (globals.css's audit block), and this is a
 * 13px numeral, not a 20px trophy glyph.
 */
export function RankBadge({
  rank,
  className,
}: {
  rank: number;
  className?: string;
}) {
  return (
    <Link
      href="/profile/leaderboard"
      // "#3" is the graphic; the link's accessible name says what it means
      // and where it goes, same split `RankButton` uses.
      aria-label={`Rank ${rank}. View leaderboard.`}
      className={cn(
        "inline-flex size-[34px] flex-none items-center justify-center rounded-full",
        "bg-amber-tint font-display text-[13px] font-semibold text-amber-text",
        "transition-colors duration-120 ease-out hover:bg-amber-ring/50",
        className,
      )}
    >
      <span aria-hidden>#{rank}</span>
    </Link>
  );
}

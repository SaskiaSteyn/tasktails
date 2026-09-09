"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
 * **A pill with a trophy, not a bare "#5" disc (#255)**: a lone numeral in a
 * circle said neither what it counted nor that it went anywhere — a test
 * participant read it as decoration and never tapped it. The trophy names the
 * subject, and the shape now matches `CoinPill` beside it, which is the
 * header's established "this is a chip you can read" affordance. It is a link,
 * so it takes the hover treatment too.
 *
 * Amber, like every other rank surface in this app (`RankButton`, the
 * leaderboard's first place), rather than the level's violet — but the tint
 * fill with `amber-text` on it, not the `bg-amber` + white the podium uses:
 * white on amber measures 2.05 (globals.css's audit block), and this is a
 * 13px numeral, not a 20px trophy glyph.
 *
 * Client-side only for `usePathname()`, which is what lets the leaderboard's
 * back arrow return to the screen you actually left (#255 again — from the
 * home header it used to strand you on Profile). Any page can link here; the
 * leaderboard treats a missing or non-local `from` as "go to Profile".
 */
export function RankBadge({
  rank,
  className,
}: {
  rank: number;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <Link
      href={`/profile/leaderboard?from=${encodeURIComponent(pathname)}`}
      // "#3" is the graphic; the link's accessible name says what it means
      // and where it goes, same split `RankButton` uses.
      aria-label={`Rank ${rank}. View leaderboard.`}
      className={cn(
        "inline-flex flex-none items-center gap-[4px] rounded-pill py-[5px] pr-[10px] pl-[7px]",
        "bg-amber-tint font-display text-[13px] font-semibold text-amber-text",
        "transition-colors duration-120 ease-out hover:bg-amber-ring/50",
        className,
      )}
    >
      <Trophy size={14} strokeWidth={2.2} aria-hidden />
      <span aria-hidden>#{rank}</span>
    </Link>
  );
}

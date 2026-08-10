import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";

/**
 * Profile's rank summary and the way into the leaderboard (LEAD-08).
 *
 * Sits between the LIFETIME grid and the Buy XP card, as the addendum draws it.
 * The whole card is the tap target, not a button inside it.
 *
 * ## Two departures from the drawn copy, both forced by what exists
 *
 * The addendum's subline is "Top 8% · climbing 3 spots". Neither half survives
 * contact with this deployment:
 *
 *  - **No movement figure.** "climbing 3 spots" is a comparison against the
 *    previous period's rank, and nothing records when coins were earned
 *    (LEAD-01/02's ledger). There is no honest way to compute it yet, and
 *    inventing one on a study instrument about manufactured pressure is exactly
 *    the wrong shortcut.
 *  - **No percentile.** "Top 8%" reads as a percentile over a large population.
 *    This study's cohort is ~11 people, where one place is nine percentage
 *    points and "Top 46%" is precision the number does not have. The cohort
 *    size is shown instead, which is the same information without the false
 *    precision — and it stays honest if the cohort grows.
 *
 * So the subline carries period and cohort ("All time · 11 participants") while
 * the numeral carries the rank, with no overlap between them. When the ledger
 * lands, LEAD-04 can put movement back here and LEAD-10's tabs can make
 * "this week" mean something again.
 */
export function RankButton({
  rank,
  participantCount,
  /** False while nobody has earned anything — the rank is real but meaningless. */
  scored,
}: {
  rank: number;
  participantCount: number;
  scored: boolean;
}) {
  return (
    <Link
      href="/profile/leaderboard"
      className="flex items-center gap-[11px] rounded-[14px] border border-rank-border bg-amber-tint px-[13px] py-[11px] transition-colors duration-120 ease-out hover:bg-amber-tint/70"
    >
      <span className="flex size-[38px] flex-none items-center justify-center rounded-[11px] bg-amber text-white">
        <Trophy size={20} strokeWidth={2} aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-[1.2] font-extrabold text-amber-text">
          Your rank
        </span>
        <span className="mt-[1px] block truncate text-[11px] leading-[1.2] font-bold text-rank-sub">
          {scored
            ? `All time · ${participantCount} participant${participantCount === 1 ? "" : "s"}`
            : "All time · no coins earned yet"}
        </span>
      </span>

      <span className="flex flex-none items-center gap-[2px]">
        <span className="font-display text-[22px] leading-none font-semibold text-rank-numeral">
          {/* "#5" is the graphic; the link's accessible name spells it out. */}
          <span aria-hidden>#{rank}</span>
          <span className="sr-only">
            Rank {rank} of {participantCount}. View leaderboard.
          </span>
        </span>
        <ChevronRight size={17} strokeWidth={2} className="text-rank-sub" aria-hidden />
      </span>
    </Link>
  );
}

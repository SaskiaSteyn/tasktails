import { Trophy } from "lucide-react";

/**
 * LEAD-14 — a board where nobody has earned anything is the state every
 * deployment starts in, and a podium of three zeroes reads as a bug. Shared by
 * the participant leaderboard and the admin copy of it (#328).
 */
export function EmptyBoard() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-10 text-center">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-amber-tint text-amber">
        <Trophy size={24} strokeWidth={2} aria-hidden />
      </span>
      <p className="mt-3 text-[13px] font-extrabold text-ink">Nobody&rsquo;s on the board yet</p>
      <p className="mt-1 text-[11.5px] leading-[1.4] font-bold text-ink-soft">
        Complete a task to earn your first coins and take the top spot.
      </p>
    </div>
  );
}

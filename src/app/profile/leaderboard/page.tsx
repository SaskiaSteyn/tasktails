import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Podium } from "@/components/leaderboard/podium";
import { RankedList } from "@/components/leaderboard/ranked-list";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { redirectAdminsAway } from "@/lib/admin";
import { allTimeLeaderboard } from "@/lib/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard · TaskTails",
};

/**
 * The leaderboard (LEAD-09), reached from Profile's rank button (LEAD-08).
 *
 * **Routed under `/profile` on purpose.** `BottomNav` lights a tab on its own
 * route and anything nested under it, so sitting here is what makes Profile the
 * active tab — which is what the addendum asks for — with no change to SHR-01.
 *
 * **No period tabs yet.** The addendum draws This week / This month / All time,
 * but only all time is answerable: nothing records *when* coins were earned
 * (LEAD-01/02's ledger). Rather than draw three segments where two are dead —
 * on a study instrument about manufactured pressure, a control that promises a
 * view and delivers nothing is exactly the wrong small lie — the period is
 * stated as a label until the ledger lands and LEAD-10 makes it a real control.
 *
 * Score is lifetime coins earned; see `leaderboard.ts` for why that and not XP.
 */
export default async function LeaderboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  await redirectAdminsAway(userId);

  const board = await allTimeLeaderboard(userId);

  // LEAD-14 — a board where nobody has earned anything is the state every
  // deployment starts in, and a podium of three zeroes reads as a bug. The
  // ranking is still correct underneath; there is just nothing to show yet.
  const nobodyScored = board.entries.every((entry) => entry.score === 0);

  return (
    <AppShell
      nav={<BottomNav />}
      header={
        <header className="flex flex-none items-center gap-3 border-b border-border-track p-3 px-[18px]">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="font-display text-[19px] leading-[1.15] font-semibold">
            Leaderboard
          </h1>
        </header>
      }
    >
      <SessionTracker />

      {/* Stands in for LEAD-10's tab row while all time is the only period. */}
      <p className="text-overline flex-none px-4 pt-3 text-ink-faint">All time</p>

      {board.entries.length === 0 || nobodyScored ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-10 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-amber-tint text-amber">
            <Trophy size={24} strokeWidth={2} aria-hidden />
          </span>
          <p className="mt-3 text-[13px] font-extrabold text-ink">
            Nobody&rsquo;s on the board yet
          </p>
          <p className="mt-1 text-[11.5px] leading-[1.4] font-bold text-ink-soft">
            Complete a task to earn your first coins and take the top spot.
          </p>
        </div>
      ) : (
        <>
          <Podium entries={board.entries} />
          <RankedList entries={board.entries} />
        </>
      )}
    </AppShell>
  );
}

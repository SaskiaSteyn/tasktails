import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LeaderboardTable } from "@/components/admin/leaderboard-table";
import { EmptyBoard } from "@/components/leaderboard/empty-board";
import { Podium } from "@/components/leaderboard/podium";
import { RankedList } from "@/components/leaderboard/ranked-list";
import { requireAdmin } from "@/lib/admin";
import { allTimeLeaderboard } from "@/lib/leaderboard";
import { displayNameFor, listParticipants } from "@/lib/users";

export const metadata: Metadata = {
  title: "Leaderboard · Admin · TaskTails",
};

/**
 * #328 — the leaderboard exactly as participants see it (the same `Podium`
 * and `RankedList`), with the admin-only details underneath. The admin isn't
 * a participant, so no row is highlighted as "you".
 */
export default async function AdminLeaderboardPage() {
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.status === 401 ? "/login" : "/tasks");

  const [board, participants] = await Promise.all([allTimeLeaderboard(null), listParticipants()]);
  const nobodyScored = board.entries.every((entry) => entry.score === 0);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4 p-4 md:gap-6 md:p-8">
      <h1 className="font-display text-[20px] font-semibold text-ink md:text-[24px]">Leaderboard</h1>

      <section className="flex flex-col overflow-hidden rounded-card-lg border border-[rgb(46_42_38/0.08)] bg-surface shadow-card">
        <p className="text-overline px-4 pt-3 text-ink-faint desk:px-[34px] desk:pt-6">
          All time · as participants see it
        </p>
        {nobodyScored ? (
          <div className="pt-10">
            <EmptyBoard />
          </div>
        ) : (
          <>
            <Podium entries={board.entries} />
            <RankedList entries={board.entries} />
          </>
        )}
      </section>

      <LeaderboardTable
        entries={board.entries}
        participants={participants.map((p) => ({
          id: p.id,
          studyId: p.studyId,
          displayName: displayNameFor(p),
          abGroup: p.abGroup,
        }))}
      />
    </div>
  );
}

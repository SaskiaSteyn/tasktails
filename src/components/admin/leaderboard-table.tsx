import type { AbGroup } from "@/generated/prisma/client";
import type { LeaderboardEntry } from "@/lib/leaderboard";

import { GroupPill } from "./group-pill";

export type LeaderboardParticipant = {
  id: string;
  studyId: string;
  displayName: string;
  abGroup: AbGroup;
};

/**
 * #328 — the admin-only columns behind the leaderboard: who each row really
 * is, their study code and group. Sits under the participant-style board on
 * `/admin/leaderboard`. "Shown as" is the name other participants see
 * (`nameFor` in leaderboard.ts).
 */
export function LeaderboardTable({
  entries,
  participants,
}: {
  entries: LeaderboardEntry[];
  participants: LeaderboardParticipant[];
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));

  return (
    <section className="rounded-card-lg border border-[rgb(46_42_38/0.08)] bg-surface shadow-card">
      <header className="rounded-t-card-lg border-b border-border-track bg-warm px-5 py-4">
        <h2 className="font-display text-[15px] font-semibold text-ink">Participant details</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border-track text-[11px] font-bold whitespace-nowrap text-ink-faint">
              <th className="px-5 py-2 font-bold">Rank</th>
              <th className="px-3 py-2 font-bold">Participant</th>
              <th className="px-3 py-2 font-bold">Shown as</th>
              <th className="px-3 py-2 font-bold">Study ID</th>
              <th className="px-3 py-2 font-bold">Group</th>
              <th className="px-3 py-2 text-right font-bold">Coins earned</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const participant = byId.get(entry.userId);
              return (
                <tr key={entry.userId} className="hover:bg-warm">
                  <td className="px-5 py-2.5 font-display text-[14px] font-semibold text-ink-soft">
                    {entry.rank}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-ink">
                    {participant?.displayName ?? entry.name}
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">{entry.name}</td>
                  <td className="px-3 py-2.5 font-mono text-[11.5px] text-ink-soft">
                    {participant?.studyId}
                  </td>
                  <td className="px-3 py-2.5">
                    {participant ? <GroupPill group={participant.abGroup} /> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-ink">
                    {entry.score.toLocaleString("en-US")}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-ink-faint">
                  No participants yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

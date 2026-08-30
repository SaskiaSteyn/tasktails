import type { ParticipantTelemetrySummary } from "@/lib/admin";

import { formatDuration, formatShortDate } from "./format";
import { GroupPill } from "./group-pill";

/**
 * ADM-02 — per-user telemetry table: participant, A/B group, session count,
 * total time in app, days returning, tasks completed.
 *
 * A row is a button, not just a clickable `<tr>`: keyboard and screen-reader
 * users need the same "open this participant's detail" affordance a mouse
 * click gives, and a `<tr onClick>` gives neither.
 */
export function EngagementTable({
  participants,
  selectedId,
  onSelect,
}: {
  participants: ParticipantTelemetrySummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-card-lg border border-[rgb(46_42_38/0.08)] bg-surface shadow-card">
      <header className="rounded-t-card-lg border-b border-border-track bg-warm px-5 py-4">
        <h2 className="font-display text-[15px] font-semibold text-ink">
          Engagement — per participant
        </h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border-track text-[11px] font-bold text-ink-faint">
              <th className="px-5 py-2 font-bold">Participant</th>
              <th className="px-3 py-2 font-bold">Study ID</th>
              <th className="px-3 py-2 font-bold">Group</th>
              <th className="px-3 py-2 font-bold">Sessions</th>
              <th className="px-3 py-2 font-bold">Time in app</th>
              <th className="px-3 py-2 font-bold">Days returning</th>
              <th className="px-3 py-2 font-bold">Tasks completed</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr
                key={participant.id}
                className={
                  participant.id === selectedId ? "bg-violet-tint/40" : "hover:bg-warm"
                }
              >
                <td className="px-5 py-0">
                  <button
                    type="button"
                    onClick={() => onSelect(participant.id)}
                    className="w-full py-2.5 text-left font-bold text-ink"
                  >
                    {participant.displayName}
                    <span className="block text-[11px] font-normal text-ink-faint">
                      joined {formatShortDate(participant.joinedAt)}
                    </span>
                  </button>
                </td>
                <td className="px-3 py-2.5 font-mono text-[11.5px] text-ink-soft">
                  {participant.studyId}
                </td>
                <td className="px-3 py-2.5">
                  <GroupPill group={participant.abGroup} />
                </td>
                <td className="px-3 py-2.5 font-bold text-ink">{participant.sessionCount}</td>
                <td className="px-3 py-2.5 text-ink">
                  {formatDuration(participant.totalTimeInAppMs)}
                </td>
                <td className="px-3 py-2.5 text-ink">{participant.daysReturning}</td>
                <td className="px-3 py-2.5 text-ink">{participant.tasksCompleted}</td>
              </tr>
            ))}
            {participants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-ink-faint">
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

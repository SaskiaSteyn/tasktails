import type { ParticipantTelemetrySummary } from "@/lib/admin";

import { GroupPill } from "./group-pill";

/**
 * ADM-03 — per-user store telemetry table: participant, A/B group, store
 * visits, items viewed, items purchased, avg time on store page.
 *
 * A separate table from `EngagementTable` rather than more columns bolted
 * onto it, matching ADM-02/03 being two distinct tickets with two distinct
 * column sets in the design.
 */
export function StoreTable({
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
          Store — per participant
        </h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-border-track text-[11px] font-bold text-ink-faint">
              <th className="px-5 py-2 font-bold">Participant</th>
              <th className="px-3 py-2 font-bold">Group</th>
              <th className="px-3 py-2 font-bold">Store visits</th>
              <th className="px-3 py-2 font-bold">Items viewed</th>
              <th className="px-3 py-2 font-bold">Items purchased</th>
              <th className="px-3 py-2 font-bold">Avg. time on store page</th>
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
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <GroupPill group={participant.abGroup} />
                </td>
                <td className="px-3 py-2.5 font-bold text-ink">{participant.storeVisits}</td>
                <td className="px-3 py-2.5 text-ink">{participant.itemsViewed}</td>
                <td className="px-3 py-2.5 text-ink">{participant.itemsPurchased}</td>
                <td className="px-3 py-2.5 text-ink">
                  {participant.avgTimeOnStorePageMs > 0
                    ? `${Math.round(participant.avgTimeOnStorePageMs / 1000)}s`
                    : "—"}
                </td>
              </tr>
            ))}
            {participants.length === 0 ? (
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

import type { StudyAggregate } from "@/lib/admin";

import { CompareBar } from "./compare-bar";

/** One tile in the KPI row — same tile styling for every stat, only the value differs. */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[13px] border border-border-track bg-warm p-3">
      <p className="text-[11px] font-bold text-ink-faint">{label}</p>
      <p className="font-display text-[22px] leading-tight font-semibold text-ink">
        {value}
      </p>
    </div>
  );
}

/**
 * ADM-05 — the study overview card: KPI row, then a Group A vs Group B bar
 * per metric there's real data for, then ADM-11's AI insight callout.
 *
 * Only one comparison metric is drawn — avg store visits — not the design
 * mock's three. The mock's second bar is "items viewed → purchased
 * conversion", removed (issue #178's follow-up) because there's no "view an
 * item" UI yet to generate `ITEM_VIEWED` events, so it only ever read 0%;
 * its third bar is "perceived trust", and ADM-12 documents that no
 * instrument for it exists yet. Drawing an empty or fabricated bar would be
 * worse than one fewer row.
 *
 * `insight` is computed by the server page (`studyInsight()`, `@/lib/admin`)
 * and passed down as a plain string, not called from here: this component
 * is rendered inside `AdminDashboard`'s `"use client"` tree, and `@/lib/
 * admin`'s runtime module drags in the full Prisma client — importing it as
 * a value here (rather than the type-only import above) would bundle that
 * into the browser and fail to compile (confirmed live — see this ticket's
 * status note).
 */
export function StudyOverviewCard({
  aggregate,
  insight,
}: {
  aggregate: StudyAggregate;
  insight: string | null;
}) {
  const [groupA, groupB] = aggregate.groups;

  const maxStoreVisits = Math.max(groupA.avgStoreVisits, groupB.avgStoreVisits, 1);

  return (
    <section className="rounded-card-lg border border-[rgb(46_42_38/0.08)] bg-surface shadow-card">
      <header className="rounded-t-card-lg border-b border-border-track bg-warm px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-semibold text-ink">Study overview</h2>
          <span className="inline-flex items-center gap-1 rounded-pill bg-sage-tint px-[10px] py-[3px] text-[11px] font-bold text-sage-text">
            ● Live
          </span>
        </div>
        <p className="mt-1 text-[12px] text-ink-faint">
          IMY761 · {aggregate.participantCount}{" "}
          {aggregate.participantCount === 1 ? "participant" : "participants"}
        </p>
      </header>

      <div className="p-5">
        <div className="grid grid-cols-4 gap-[11px]">
          <StatTile label="Participants" value={String(aggregate.participantCount)} />
          <StatTile
            label="Telemetry events"
            value={aggregate.telemetryEventCount.toLocaleString()}
          />
          <StatTile
            label="Tasks done"
            value={aggregate.tasksCompletedCount.toLocaleString()}
          />
          <StatTile label="Purchases" value={aggregate.purchasesCount.toLocaleString()} />
        </div>

        <p className="mt-6 mb-3 text-[12px] font-extrabold tracking-[0.4px] text-ink-faint">
          GROUP A (CONTROL) VS GROUP B (URGENCY)
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[12px] text-ink-soft">Avg. store visits / participant</p>
            <div className="flex flex-col gap-1.5">
              <CompareBar
                group="A"
                value={groupA.avgStoreVisits.toFixed(1)}
                widthPercent={(groupA.avgStoreVisits / maxStoreVisits) * 100}
              />
              <CompareBar
                group="B"
                value={groupB.avgStoreVisits.toFixed(1)}
                widthPercent={(groupB.avgStoreVisits / maxStoreVisits) * 100}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[12px] bg-violet-tint px-[14px] py-3 text-[12px] text-violet-text">
          {insight ? (
            <p>
              <b className="font-extrabold text-violet">AI insight: </b>
              {insight}
            </p>
          ) : (
            <p>Not enough data in both groups yet to compare Group A and Group B.</p>
          )}
        </div>
      </div>
    </section>
  );
}

import type { StudyAggregate } from "@/lib/admin";

/**
 * #224 — the "Earning cooldown" admin card
 * (`design_handoff/ADDENDUM-earning-cooldown.md` §6, mock §3). Two questions:
 * which 3-task difficulty mixes trigger cooldowns, and once one lifts how
 * long until the next task gets done (mean, not median).
 *
 * Same card chrome as `StudyOverviewCard` — KPI tiles, then a Group A/B bar.
 * Renders an empty-ish state while no cooldown has fired yet (pre-study, or a
 * freshly wiped database) rather than a grid of dashes.
 */

const TIER_LABEL = ["", "Trivial", "Small", "Medium", "Large", "Epic"] as const;

/** `"1-3-3"` → "Trivial · Medium · Medium". */
function mixLabel(mixKey: string): string {
  return mixKey
    .split("-")
    .map((n) => TIER_LABEL[Number(n)] ?? "?")
    .join(" · ");
}

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

const minutes = (value: number | null): string =>
  value === null ? "—" : `${Math.round(value)} min`;

export function EarningCooldownCard({
  metrics,
}: {
  metrics: StudyAggregate["earningCooldown"];
}) {
  const {
    cooldownsTriggered,
    avgCooldownMinutes,
    avgWaitToNextTaskMinutes,
    midCooldownCompletions,
    byMix,
    midCooldownByGroup,
    totalCompletionsByGroup,
  } = metrics;

  const maxMixCount = Math.max(1, ...byMix.map((row) => row.count));

  return (
    <section className="rounded-card-lg border border-[rgb(46_42_38/0.08)] bg-surface shadow-card">
      <header className="rounded-t-card-lg border-b border-border-track bg-warm px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-semibold text-ink">
            Earning cooldown
          </h2>
          <span className="inline-flex items-center gap-1 rounded-pill bg-sage-tint px-[10px] py-[3px] text-[11px] font-bold text-sage-text">
            ● Live
          </span>
        </div>
        <p className="mt-1 text-[12px] text-ink-faint">
          #224 — after 3 rewarded tasks, a 20–60 min pause. How long before the
          next task once it lifts?
        </p>
      </header>

      <div className="p-5">
        <div className="grid grid-cols-4 gap-[11px]">
          <StatTile label="Cooldowns triggered" value={cooldownsTriggered.toLocaleString()} />
          <StatTile label="Avg cooldown length" value={minutes(avgCooldownMinutes)} />
          <StatTile label="Avg wait to next task" value={minutes(avgWaitToNextTaskMinutes)} />
          <StatTile label="Done mid-cooldown" value={midCooldownCompletions.toLocaleString()} />
        </div>

        {byMix.length === 0 ? (
          <p className="mt-6 rounded-[13px] border border-dashed border-checkbox px-4 py-6 text-center text-[12px] text-ink-faint">
            No cooldowns yet. This fills in once participants complete tasks in
            threes.
          </p>
        ) : (
          <>
            <p className="mt-6 mb-3 text-[12px] font-extrabold tracking-[0.4px] text-ink-faint">
              COOLDOWNS BY TASK-DIFFICULTY MIX
            </p>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="text-[10px] font-extrabold tracking-[0.3px] text-ink-faint">
                  <th className="border-b border-border-track px-2 pb-2 text-left">
                    Mix (the 3 tasks)
                  </th>
                  <th className="border-b border-border-track px-2 pb-2 text-right">
                    Cooldown
                  </th>
                  <th className="border-b border-border-track px-2 pb-2 text-right">
                    Cooldowns
                  </th>
                  <th className="border-b border-border-track px-2 pb-2 text-right">
                    Avg wait to next task
                  </th>
                </tr>
              </thead>
              <tbody>
                {byMix.map((row) => (
                  <tr key={row.mixKey} className="font-bold">
                    <td className="border-b border-border-track px-2 py-2 text-ink">
                      {mixLabel(row.mixKey)}
                    </td>
                    <td className="border-b border-border-track px-2 py-2 text-right text-ink-soft">
                      {row.cooldownMinutes} min
                    </td>
                    <td className="relative border-b border-border-track px-2 py-2 text-right font-display font-semibold tabular-nums">
                      {row.count.toLocaleString()}
                      <span
                        aria-hidden
                        className="absolute inset-x-2 bottom-[3px] h-[3px] rounded-[2px] bg-border-track"
                      >
                        <span
                          className="block h-full rounded-[2px] bg-amber-ring"
                          style={{ width: `${(row.count / maxMixCount) * 100}%` }}
                        />
                      </span>
                    </td>
                    <td className="border-b border-border-track px-2 py-2 text-right font-display font-semibold tabular-nums text-ink-soft">
                      {minutes(row.avgWaitMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <p className="mt-6 mb-3 text-[12px] font-extrabold tracking-[0.4px] text-ink-faint">
          TASKS COMPLETED DURING A COOLDOWN (EARNED NOTHING)
        </p>
        <div className="flex flex-col gap-2">
          <CooldownSplitBar
            group="A"
            mid={midCooldownByGroup.A}
            total={totalCompletionsByGroup.A}
          />
          <CooldownSplitBar
            group="B"
            mid={midCooldownByGroup.B}
            total={totalCompletionsByGroup.B}
          />
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Red = completed while a cooldown was running. Wider red = the arm
          kept working through the pause more.
        </p>
      </div>
    </section>
  );
}

/** One arm's "open vs mid-cooldown" completion split. */
function CooldownSplitBar({
  group,
  mid,
  total,
}: {
  group: "A" | "B";
  mid: number;
  total: number;
}) {
  const safeTotal = Math.max(total, mid);
  const midPercent = safeTotal === 0 ? 0 : (mid / safeTotal) * 100;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-[18px] flex-none text-center text-[11px] font-extrabold ${
          group === "A" ? "text-sage-text" : "text-urgency-text"
        }`}
      >
        {group}
      </span>
      <div className="flex h-4 flex-1 overflow-hidden rounded-[5px] bg-border-track">
        <span className="block h-full bg-sage" style={{ width: `${100 - midPercent}%` }} />
        <span className="block h-full bg-urgency" style={{ width: `${midPercent}%` }} />
      </div>
      <span className="w-16 flex-none text-right text-[12px] font-bold text-ink">
        {mid}/{safeTotal}
      </span>
    </div>
  );
}

"use client";

import type { GroupComparison } from "@/lib/analysis";

import { AnalysisCard, formatP, formatValue, jitter } from "./analysis-card";
import { EChart } from "./echart";

/**
 * #329 chart 1 — Group A vs Group B on each dependent variable, one dot per
 * participant. Every participant is drawn rather than a mean bar: at this
 * sample size a single heavy spender decides a mean, and the dots show it.
 * The bar in each lane is that group's median.
 */
function MetricChart({ comparison }: { comparison: GroupComparison }) {
  const { A, B, test, unit, label } = comparison;
  // Durations are plotted in minutes — an axis in milliseconds is unreadable.
  const scale = unit === "duration" ? 1 / 60_000 : 1;

  return (
    <div className="rounded-[13px] border border-border-track p-3">
      <EChart
        height={170}
        label={`${label}: median A ${formatValue(A.median, unit)}, median B ${formatValue(B.median, unit)}`}
        build={(t) => ({
          grid: { left: 8, right: 12, top: 28, bottom: 4, containLabel: true },
          legend: { show: false },
          tooltip: {
            trigger: "item",
            formatter: (p: { data: [number, number, string] }) =>
              `${p.data[2]}<br/><b>${formatValue(p.data[0] / scale, unit)}</b>`,
          },
          xAxis: { type: "value", min: 0 },
          yAxis: {
            type: "value",
            min: -0.5,
            max: 1.5,
            // Ticks every half lane so the lane centres (0, 1) get a label.
            interval: 0.5,
            inverse: true,
            splitLine: { show: false },
            axisLabel: {
              color: t.inkSoft,
              fontWeight: "bold",
              formatter: (v: number) => (v === 0 ? "Group A" : v === 1 ? "Group B" : ""),
            },
          },
          series: [
            ...(["A", "B"] as const).map((group, lane) => ({
              name: `Group ${group}`,
              type: "scatter",
              symbolSize: 9,
              itemStyle: { color: t[group], opacity: 0.75 },
              data: (group === "A" ? A : B).values.map((point) => [
                point.value * scale,
                lane + jitter(point.studyId),
                point.studyId,
              ]),
            })),
            {
              name: "Median",
              type: "scatter",
              symbol: "rect",
              symbolSize: [3, 30],
              itemStyle: { color: t.ink },
              tooltip: { formatter: (p: { data: [number, number] }) => `Median<br/><b>${formatValue(p.data[0] / scale, unit)}</b>` },
              data: [A.median, B.median]
                .map((m, lane) => (m === null ? null : [m * scale, lane]))
                .filter(Boolean),
            },
          ],
          title: {
            text: unit === "duration" ? `${label} (minutes)` : label,
            left: 0,
            top: 0,
            textStyle: { fontFamily: t.displayFont, fontSize: 13, fontWeight: 600, color: t.ink },
          },
        })}
      />
      <p className="mt-1 text-[11.5px] text-ink-soft">
        Median <b className="text-ink">A {formatValue(A.median, unit)}</b> ·{" "}
        <b className="text-ink">B {formatValue(B.median, unit)}</b>
        {test ? (
          <>
            {" "}
            · Mann-Whitney U = {test.u}, <b className="text-ink">{formatP(test.p)}</b>, r ={" "}
            {test.r.toFixed(2)}
          </>
        ) : (
          " · needs both groups to test"
        )}
      </p>
    </div>
  );
}

export function GroupComparisonCard({ comparisons }: { comparisons: GroupComparison[] }) {
  return (
    <AnalysisCard
      title="Group A vs Group B — per participant"
      blurb="Each dot is one participant; the dark bar is the group median. Mann-Whitney U, two-sided; r is the rank-biserial effect size (positive = Group B higher)."
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {comparisons.map((comparison) => (
          <MetricChart key={comparison.key} comparison={comparison} />
        ))}
      </div>
    </AnalysisCard>
  );
}

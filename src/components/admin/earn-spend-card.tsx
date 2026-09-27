"use client";

import type { EarnSpend } from "@/lib/analysis";

import { AnalysisCard, formatP, formatValue } from "./analysis-card";
import { EChart } from "./echart";

/**
 * #329 chart 2 — coins earned vs coins spent, one dot per participant. The
 * diagonal is "spent everything they earned"; the further a dot sits towards
 * it, the bigger the share of their income that went into the store.
 */
export function EarnSpendCard({ data }: { data: EarnSpend }) {
  const { points, share } = data;
  const max = Math.max(1, ...points.map((p) => Math.max(p.earned, p.spent)));

  return (
    <AnalysisCard
      title="Coins earned vs coins spent"
      blurb="Each dot is one participant. The dashed line is spending everything earned. Share of earnings spent controls for how much each person worked."
    >
      <EChart
        height={320}
        label={`Earned vs spent scatter; median share spent A ${formatValue(share.A.median, "percent")}, B ${formatValue(share.B.median, "percent")}`}
        build={(t) => ({
          tooltip: {
            trigger: "item",
            formatter: (p: { data: [number, number, string] }) =>
              `${p.data[2]}<br/>earned <b>${p.data[0].toLocaleString("en-US")}</b> · spent <b>${p.data[1].toLocaleString("en-US")}</b>`,
          },
          legend: { data: ["Group A", "Group B"] },
          xAxis: { type: "value", name: "coins earned", nameLocation: "middle", nameGap: 26, min: 0 },
          yAxis: { type: "value", name: "coins spent", nameLocation: "middle", nameGap: 40, min: 0 },
          grid: { left: 22, right: 16, top: 36, bottom: 28, containLabel: true },
          series: [
            ...(["A", "B"] as const).map((group) => ({
              name: `Group ${group}`,
              type: "scatter",
              symbolSize: 10,
              itemStyle: { color: t[group], opacity: 0.8 },
              data: points
                .filter((p) => p.group === group)
                .map((p) => [p.earned, p.spent, p.studyId]),
            })),
            {
              name: "Spent all",
              type: "line",
              silent: true,
              symbol: "none",
              lineStyle: { color: t.inkFaint, type: "dashed", width: 1 },
              data: [
                [0, 0],
                [max, max],
              ],
            },
          ],
        })}
      />
      <p className="mt-2 text-[11.5px] text-ink-soft">
        Median share spent <b className="text-ink">A {formatValue(share.A.median, "percent")}</b> ·{" "}
        <b className="text-ink">B {formatValue(share.B.median, "percent")}</b>
        {share.test ? (
          <>
            {" "}
            · Mann-Whitney U = {share.test.u}, <b className="text-ink">{formatP(share.test.p)}</b>, r ={" "}
            {share.test.r.toFixed(2)}
          </>
        ) : null}
      </p>
    </AnalysisCard>
  );
}

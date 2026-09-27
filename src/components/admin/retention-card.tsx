"use client";

import type { RetentionChart } from "@/lib/analysis";

import { AnalysisCard } from "./analysis-card";
import { EChart } from "./echart";

/** #329 chart 6 — the share of each group still using the app by study day. */
export function RetentionCard({ data }: { data: RetentionChart }) {
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

  return (
    <AnalysisCard
      title="Retention by study day"
      blurb="Of the participants who have reached day N, the share still active on day N or later. Hover for how many have reached each day."
    >
      <EChart
        height={320}
        label={`Retention by study day; day 14: A ${pct(data.A[13])}, B ${pct(data.B[13])}`}
        build={(t) => ({
          tooltip: {
            trigger: "axis",
            formatter: (items: { seriesName: string; value: number | null; dataIndex: number }[]) =>
              `Day ${data.days[items[0].dataIndex]}<br/>` +
              items
                .map((item) => {
                  const group = item.seriesName.slice(-1) as "A" | "B";
                  return `${item.seriesName}: <b>${pct(item.value)}</b> (n = ${data.reached[group][item.dataIndex]})`;
                })
                .join("<br/>"),
          },
          xAxis: {
            type: "category",
            data: data.days,
            name: "study day",
            nameLocation: "middle",
            nameGap: 26,
            boundaryGap: false,
            splitLine: { show: false },
          },
          yAxis: {
            type: "value",
            min: 0,
            max: 1,
            axisLabel: { color: t.inkFaint, formatter: (v: number) => `${Math.round(v * 100)}%` },
          },
          grid: { left: 8, right: 16, top: 36, bottom: 28, containLabel: true },
          series: (["A", "B"] as const).map((group) => ({
            name: `Group ${group}`,
            type: "line",
            step: "end",
            symbol: "none",
            itemStyle: { color: t[group] },
            lineStyle: { color: t[group], width: 2.5 },
            data: data[group],
          })),
        })}
      />
    </AnalysisCard>
  );
}

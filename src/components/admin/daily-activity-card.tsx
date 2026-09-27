"use client";

import { useState } from "react";

import type { DailyActivityChart } from "@/lib/analysis";
import { cn } from "@/lib/cn";

import { AnalysisCard } from "./analysis-card";
import { EChart } from "./echart";

/**
 * #329 chart 4 — mean activity per participant on each study day, by group.
 * Shows whether urgency front-loads spending and then fades, and whether one
 * group drifts away sooner.
 */
export function DailyActivityCard({ data }: { data: DailyActivityChart }) {
  const [key, setKey] = useState(data.series[0].key);
  const series = data.series.find((s) => s.key === key)!;

  return (
    <AnalysisCard
      title="Activity by study day"
      blurb="Mean per participant on each day of their own study, counted from the day they joined. A day only averages over participants who have reached it — hover for how many."
    >
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Metric">
        {data.series.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={s.key === key}
            onClick={() => setKey(s.key)}
            className={cn(
              "rounded-pill border px-3 py-1 text-[12px] font-bold",
              s.key === key
                ? "border-violet bg-violet-tint text-violet-text"
                : "border-border-track text-ink-soft hover:bg-warm",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <EChart
        height={320}
        label={`${series.label} per participant by study day, Group A and Group B`}
        build={(t) => ({
          tooltip: {
            trigger: "axis",
            formatter: (items: { seriesName: string; value: number | null; dataIndex: number }[]) =>
              `Day ${data.days[items[0].dataIndex]}<br/>` +
              items
                .map((item) => {
                  const group = item.seriesName.slice(-1) as "A" | "B";
                  const n = data.reached[group][item.dataIndex];
                  return `${item.seriesName}: <b>${item.value === null ? "—" : item.value.toFixed(2)}</b> (n = ${n})`;
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
          yAxis: { type: "value", min: 0 },
          grid: { left: 8, right: 16, top: 36, bottom: 28, containLabel: true },
          series: (["A", "B"] as const).map((group) => ({
            name: `Group ${group}`,
            type: "line",
            smooth: false,
            symbolSize: 6,
            itemStyle: { color: t[group] },
            lineStyle: { color: t[group], width: 2.5 },
            data: series[group],
          })),
        })}
      />
    </AnalysisCard>
  );
}

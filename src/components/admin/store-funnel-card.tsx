"use client";

import type { StoreFunnel } from "@/lib/analysis";

import { AnalysisCard } from "./analysis-card";
import { EChart } from "./echart";

/** #329 chart 3 — the store funnel, Group A beside Group B at each stage. */
export function StoreFunnelCard({ data }: { data: StoreFunnel }) {
  const { stages, perVisit, groupSize } = data;

  return (
    <AnalysisCard
      title="Store funnel by group"
      blurb={`Share of each group that reached each stage at least once (A: ${groupSize.A} participants, B: ${groupSize.B}). Lucky Boxes skip the cart, so "Bought anything" can be higher than "Added to cart".`}
    >
      <EChart
        height={300}
        label={stages
          .map((s) => `${s.label}: A ${Math.round(s.A * 100)}%, B ${Math.round(s.B * 100)}%`)
          .join("; ")}
        build={(t) => ({
          tooltip: { trigger: "axis", valueFormatter: (v: number) => `${Math.round(v * 100)}%` },
          xAxis: { type: "category", data: stages.map((s) => s.label), splitLine: { show: false } },
          yAxis: {
            type: "value",
            min: 0,
            max: 1,
            axisLabel: { color: t.inkFaint, formatter: (v: number) => `${Math.round(v * 100)}%` },
          },
          series: (["A", "B"] as const).map((group) => ({
            name: `Group ${group}`,
            type: "bar",
            barMaxWidth: 48,
            itemStyle: { color: t[group], borderRadius: [5, 5, 0, 0] },
            label: {
              show: true,
              position: "top",
              color: t.inkSoft,
              fontSize: 11,
              formatter: (p: { value: number }) => `${Math.round(p.value * 100)}%`,
            },
            data: stages.map((s) => s[group]),
          })),
        })}
      />
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {perVisit.map((row) => (
          <div key={row.label} className="rounded-[13px] border border-border-track bg-warm p-3">
            <dt className="text-[11px] font-bold text-ink-faint">{row.label}</dt>
            <dd className="mt-1 flex gap-4 font-display text-[18px] font-semibold">
              <span className="text-sage-text">A {row.A === null ? "—" : row.A.toFixed(2)}</span>
              <span className="text-urgency-text">B {row.B === null ? "—" : row.B.toFixed(2)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </AnalysisCard>
  );
}

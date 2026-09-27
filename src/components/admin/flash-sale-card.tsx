"use client";

import type { FlashSaleComparison } from "@/lib/analysis";

import { AnalysisCard, formatP } from "./analysis-card";
import { EChart } from "./echart";

/**
 * #329 chart 5 — Group B only: items bought per store visit on normal days vs
 * flash-sale days. One line per participant; the dark line joins the medians.
 */
export function FlashSaleCard({ data }: { data: FlashSaleComparison }) {
  const { participants, median, up, down, same, p } = data;
  const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(2));

  return (
    <AnalysisCard
      title="Flash-sale days vs normal days (Group B)"
      blurb="Items bought per store visit, each Group B participant against themselves. Only the flash-sale layer switches between the two; the other urgency cues run every day. Participants need a visit on both kinds of day to appear."
    >
      {participants.length === 0 ? (
        <p className="py-10 text-center text-[12.5px] text-ink-faint">
          No Group B participant has visited the store on both a sale day and a normal day yet.
        </p>
      ) : (
        <EChart
          height={340}
          label={`Median items per visit: normal days ${fmt(median.rest)}, sale days ${fmt(median.sale)}`}
          build={(t) => ({
            legend: { show: false },
            tooltip: {
              trigger: "item",
              formatter: (item: { seriesName: string; value: number; dataIndex: number }) => {
                const row = participants.find((r) => r.studyId === item.seriesName);
                const visits = row ? (item.dataIndex === 0 ? row.restVisits : row.saleVisits) : null;
                return `${item.seriesName}<br/><b>${item.value.toFixed(2)}</b> items per visit${visits === null ? "" : ` (${visits} visits)`}`;
              },
            },
            xAxis: {
              type: "category",
              data: ["Normal days", "Flash-sale days"],
              boundaryGap: true,
              splitLine: { show: false },
              axisLabel: { color: t.inkSoft, fontWeight: "bold" },
            },
            yAxis: { type: "value", min: 0, name: "items per visit" },
            series: [
              ...participants.map((row) => ({
                name: row.studyId,
                type: "line",
                symbolSize: 7,
                itemStyle: { color: t.B },
                lineStyle: { color: t.B, width: 1.5, opacity: 0.45 },
                emphasis: { lineStyle: { width: 3, opacity: 1 } },
                data: [row.rest, row.sale],
              })),
              {
                name: "Median",
                type: "line",
                symbol: "rect",
                symbolSize: 10,
                itemStyle: { color: t.ink },
                lineStyle: { color: t.ink, width: 3 },
                z: 10,
                data: [median.rest, median.sale],
              },
            ],
          })}
        />
      )}
      <p className="mt-2 text-[11.5px] text-ink-soft">
        Median <b className="text-ink">normal {fmt(median.rest)}</b> ·{" "}
        <b className="text-ink">sale {fmt(median.sale)}</b> · {up} bought more on sale days, {down}{" "}
        fewer, {same} the same
        {p === null ? null : (
          <>
            {" "}
            · sign test <b className="text-ink">{formatP(p)}</b>
          </>
        )}
      </p>
    </AnalysisCard>
  );
}

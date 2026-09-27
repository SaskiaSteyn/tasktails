import type { ReactNode } from "react";

import type { GroupComparison } from "@/lib/analysis";

import { formatDuration } from "./format";

/** #329 — the card shell every analysis chart sits in, same as the dashboard's other cards. */
export function AnalysisCard({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card-lg border border-[rgb(46_42_38/0.08)] bg-surface shadow-card">
      <header className="rounded-t-card-lg border-b border-border-track bg-warm px-5 py-4">
        <h2 className="font-display text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-[12px] text-ink-faint">{blurb}</p>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function formatValue(value: number | null, unit: GroupComparison["unit"]): string {
  if (value === null) return "—";
  if (unit === "duration") return formatDuration(value);
  if (unit === "percent") return `${Math.round(value * 100)}%`;
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toFixed(1);
}

export function formatP(p: number): string {
  return p < 0.001 ? "p < .001" : `p = ${p.toFixed(3).replace(/^0/, "")}`;
}

/**
 * A stable vertical offset in −0.25…0.25 from a study code, so overlapping
 * dots spread out and stay put between reloads.
 */
export function jitter(key: string): number {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.5;
}

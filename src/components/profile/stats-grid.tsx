import type { LifetimeStats } from "@/lib/stats";
import { cn } from "@/lib/cn";

/**
 * PRO-04 — the "LIFETIME" 2×2 grid. Pure presentation: the Profile page
 * (a server component) reads `lifetimeStatsFor()` itself and hands the result
 * down, the same way it already does for `economy` — no client fetch needed
 * for a screen with nothing to interact with.
 *
 * Value colours are each accent's audited `-text` token, not the mock's raw
 * fill colours (`#5FA97E`, `#8478C4`…) — those measure 2.3–2.9 BPCA as running
 * text on this background, well under AA, whereas the `-text` variants exist
 * specifically for this (see `globals.css`'s audit). Day streak is the one
 * exception, `text-terracotta` at 2.40: there's no `terracotta-text` token,
 * and the audit already accepts this exact trade for the persistent header's
 * streak numeral — this tile is the same content, not a new gap.
 */
export function StatsGrid({ stats }: { stats: LifetimeStats }) {
  return (
    <section>
      <p className="text-overline mb-[10px]">Lifetime</p>
      <div className="grid grid-cols-2 gap-[10px] desk:grid-cols-4 desk:gap-4">
        <StatTile
          value={stats.tasksDone}
          label="tasks done"
          colorClass="text-sage-text"
        />
        <StatTile
          value={stats.coinsEarned}
          label="coins earned"
          colorClass="text-amber-text"
        />
        <StatTile
          value={stats.dayStreak}
          label="day streak"
          colorClass="text-terracotta"
        />
        <StatTile
          value={stats.animalsOwned}
          label="animals"
          colorClass="text-violet-text"
        />
      </div>
    </section>
  );
}

function StatTile({
  value,
  label,
  colorClass,
}: {
  value: number;
  label: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-[13px] border border-border-track bg-warm px-3 py-[11px]">
      <p
        className={cn(
          "font-display text-[20px] leading-none font-semibold",
          colorClass,
        )}
      >
        {value.toLocaleString()}
      </p>
      <p className="mt-[2px] text-[10.5px] font-bold text-ink-soft">{label}</p>
    </div>
  );
}

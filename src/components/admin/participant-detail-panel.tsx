"use client";

import { useEffect, useState } from "react";

import type { ParticipantTelemetryDetail } from "@/lib/admin";
import { cn } from "@/lib/cn";

import { formatDuration, formatShortDate } from "./format";
import { GroupPill } from "./group-pill";

/** One 2×2 stat tile — same visual language as the overview card's KPI row. */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-border-track bg-warm p-[11px]">
      <p className="text-[11px] font-bold text-ink-faint">{label}</p>
      <p className="font-display text-[19px] leading-tight font-semibold text-ink">{value}</p>
    </div>
  );
}

/** One row of the store funnel — width relative to `max`, a fixed semantic colour per stage. */
function FunnelRow({
  label,
  value,
  max,
  fill,
}: {
  label: string;
  value: number;
  max: number;
  fill: string;
}) {
  const widthPercent = max === 0 ? 0 : (value / max) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="w-[70px] flex-none text-[11px] text-ink-soft">{label}</span>
      <div className="h-3.5 flex-1 overflow-hidden rounded-[5px] bg-border-track">
        <div
          className={cn("h-full rounded-[5px]", fill)}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="w-6 flex-none text-right text-[12px] font-bold text-ink">{value}</span>
    </div>
  );
}

type DetailState = {
  id: string;
  status: "loading" | "ready" | "error";
  detail: ParticipantTelemetryDetail | null;
};

/**
 * Tracks which `participantId` a fetch was actually for, rather than
 * resetting to "loading" with a synchronous `setState` at the top of the
 * effect — the state update belongs in the fetch's own callback, and a
 * request for a since-abandoned id is recognised by comparing `state.id`
 * against the current `participantId` at render time instead.
 */
function useParticipantDetail(participantId: string) {
  const [state, setState] = useState<DetailState>({
    id: participantId,
    status: "loading",
    detail: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/admin/users/${participantId}/telemetry`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      // `res.json()` gives back `joinedAt` as an ISO string, not the `Date`
      // the server-side type claims — plain JSON has no date type, unlike
      // the RSC serialisation `EngagementTable`'s server-fetched props go
      // through. Revived here, once, rather than trusting the type.
      .then((body: { participant: Omit<ParticipantTelemetryDetail, "joinedAt"> & { joinedAt: string } }) => {
        if (!cancelled) {
          const participant = { ...body.participant, joinedAt: new Date(body.participant.joinedAt) };
          setState({ id: participantId, status: "ready", detail: participant });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ id: participantId, status: "error", detail: null });
      });

    return () => {
      cancelled = true;
    };
  }, [participantId]);

  if (state.id !== participantId) return { detail: null, status: "loading" as const };
  return { detail: state.detail, status: state.status };
}

/**
 * ADM-01's second card design, driven live by ADM-07's endpoint: stat grid,
 * store funnel and 14-day return-pattern sparkline for whichever participant
 * a table row was clicked for.
 */
export function ParticipantDetailPanel({ participantId }: { participantId: string }) {
  const { detail, status } = useParticipantDetail(participantId);

  if (status === "loading") {
    return (
      <section className="rounded-card-lg border border-[rgb(46_42_38/0.08)] bg-surface p-5 shadow-card">
        <p className="text-[12px] text-ink-faint">Loading participant…</p>
      </section>
    );
  }

  if (status === "error" || !detail) {
    return (
      <section className="rounded-card-lg border border-[rgb(46_42_38/0.08)] bg-surface p-5 shadow-card">
        <p className="text-[12px] text-ink-faint">Could not load this participant.</p>
      </section>
    );
  }

  const initials = detail.displayName.slice(0, 3).toUpperCase();
  const maxFunnel = Math.max(detail.itemsViewed, 1);

  return (
    <section className="rounded-card-lg border border-[rgb(46_42_38/0.08)] bg-surface shadow-card">
      <header className="flex items-center gap-[13px] rounded-t-card-lg border-b border-border-track bg-warm px-5 py-4">
        <span
          aria-hidden
          className="flex size-[38px] flex-none items-center justify-center rounded-full bg-violet text-[12px] font-bold text-white"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-ink">{detail.displayName}</p>
          <p className="text-[11px] text-ink-faint">
            joined {formatShortDate(detail.joinedAt)} · {detail.daysReturning} active days
          </p>
        </div>
        <GroupPill group={detail.abGroup} />
      </header>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-[10px]">
          <StatTile label="Sessions" value={String(detail.sessionCount)} />
          <StatTile label="Time in app" value={formatDuration(detail.totalTimeInAppMs)} />
          <StatTile label="Tasks completed" value={String(detail.tasksCompleted)} />
          <StatTile label="Store visits" value={String(detail.storeVisits)} />
        </div>

        <p className="mt-5 mb-2 text-[11px] font-extrabold tracking-[0.4px] text-ink-faint">
          STORE FUNNEL
        </p>
        <div className="flex flex-col gap-2">
          <FunnelRow
            label="Viewed"
            value={detail.itemsViewed}
            max={maxFunnel}
            fill="bg-ink-disabled"
          />
          <FunnelRow
            label="Added cart"
            value={detail.itemsAddedToCart}
            max={maxFunnel}
            fill="bg-amber"
          />
          <FunnelRow
            label="Purchased"
            value={detail.itemsPurchased}
            max={maxFunnel}
            fill="bg-urgency"
          />
        </div>

        <p className="mt-5 mb-2 text-[11px] font-extrabold tracking-[0.4px] text-ink-faint">
          RETURN PATTERN (14 DAYS)
        </p>
        <div className="flex h-11 items-end gap-1">
          {(() => {
            const maxCount = Math.max(...detail.dailyActivity.map((day) => day.count), 1);
            return detail.dailyActivity.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} event${day.count === 1 ? "" : "s"}`}
                className={cn(
                  "flex-1 rounded-[3px]",
                  day.count === 0 ? "bg-border-track" : "bg-violet",
                )}
                style={{ height: `${Math.max(8, (day.count / maxCount) * 100)}%` }}
              />
            ));
          })()}
        </div>
      </div>
    </section>
  );
}

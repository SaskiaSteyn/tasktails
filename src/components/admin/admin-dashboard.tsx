"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";

import type { ParticipantTelemetrySummary, StudyAggregate } from "@/lib/admin";

import { EarningCooldownCard } from "./earning-cooldown-card";
import { EngagementTable } from "./engagement-table";
import { ParticipantDetailPanel } from "./participant-detail-panel";
import { StoreTable } from "./store-table";
import { StudyOverviewCard } from "./study-overview-card";

/**
 * ADM-01's page body. Server-rendered data (`participants`/`aggregate`) in,
 * client-side selection state out — clicking a row in either table fetches
 * that participant's ADM-07 detail without a full page reload.
 *
 * `logoutSlot` is a server-rendered `<LogoutButton />` handed down from
 * `page.tsx`, not imported directly here: every participant page now
 * redirects an admin session straight to `/admin` (they have no reason to
 * see "the app" itself), which means `/settings` — the only other place
 * `LogoutButton` lives — is unreachable to them, and this would otherwise be
 * a dead end with no way to sign out. `LogoutButton` owns a server action,
 * so it has to arrive as a slot from a Server Component parent rather than
 * be imported into this Client Component directly.
 */
export function AdminDashboard({
  participants,
  aggregate,
  logoutSlot,
}: {
  participants: ParticipantTelemetrySummary[];
  aggregate: StudyAggregate;
  logoutSlot: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Below `xl` the detail panel stacks under both tables, out of sight of the
  // row that was just tapped — bring it into view so the tap visibly did something.
  function select(id: string) {
    setSelectedId(id);
    if (!window.matchMedia("(min-width: 80rem)").matches) {
      requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4 p-4 md:gap-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[20px] font-semibold text-ink md:text-[24px]">
            Admin dashboard
          </h1>
          <p className="mt-1 text-[13px] text-ink-faint">
            IMY761 researcher view — click a participant for their full telemetry.
          </p>
        </div>
        <div className="flex-none">{logoutSlot}</div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px] xl:items-start">
        <div className="flex flex-col gap-6">
          <StudyOverviewCard aggregate={aggregate} />
          <EarningCooldownCard metrics={aggregate.earningCooldown} />
          <EngagementTable
            participants={participants}
            selectedId={selectedId}
            onSelect={select}
          />
          <StoreTable
            participants={participants}
            selectedId={selectedId}
            onSelect={select}
          />
        </div>

        <div ref={panel} className="scroll-mt-4 xl:sticky xl:top-8">
          {selectedId ? (
            <ParticipantDetailPanel participantId={selectedId} />
          ) : (
            <section className="rounded-card-lg border border-dashed border-checkbox p-5 text-center text-[12px] text-ink-faint">
              Select a participant from either table to see their full telemetry.
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

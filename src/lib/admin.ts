import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AbGroup, UserRole } from "@/generated/prisma/client";
import { purchaseCount } from "@/lib/checkout";
import {
  type DailyActivity,
  dailyActivityForUser,
  sessionMetricsForUser,
  storeFunnelForUser,
  totalTelemetryEventCount,
} from "@/lib/telemetry";
import { completedTaskCount } from "@/lib/tasks";
import {
  displayNameFor,
  findUserById,
  listParticipants,
  type ParticipantSummary,
} from "@/lib/users";

/**
 * ADM-09 — the single enforcement point for the admin role.
 *
 * Same reasoning as `currentStudyGroup()` in src/lib/study-group.ts: the role
 * is read from the database on every call rather than trusted off the
 * session/JWT, so it's enforced by the row itself. `/api/admin/*` routes each
 * call this themselves (matching the "every route checks itself" convention
 * `src/proxy.ts` documents) rather than relying on the proxy, which only
 * proves "signed in", never "signed in as admin".
 *
 * SERVER ONLY — imports `auth()` and Prisma (via `findUserById`).
 */
export type AdminGateResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireAdmin(): Promise<AdminGateResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, status: 401, message: "Not signed in." };
  }

  const user = await findUserById(userId);
  if (user?.role !== UserRole.ADMIN) {
    return { ok: false, status: 403, message: "Admin role required." };
  }

  return { ok: true, userId };
}

/**
 * Sends a signed-in admin straight to `/admin` from any participant-facing
 * page — the researcher account has no reason to see "the app" itself
 * (tasks, store, zoo, profile, settings, onboarding), so every one of those
 * pages calls this right after its own signed-out check, same "every page
 * checks itself" shape the rest of the auth story already uses. A no-op for
 * a real participant.
 */
export async function redirectAdminsAway(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (user?.role === UserRole.ADMIN) redirect("/admin");
}

/**
 * ADM-06/07 — one participant's row across every telemetry table this
 * module composes rather than owns: `users.ts` (identity/group),
 * `tasks.ts` (completions), `checkout.ts` (purchases) and `telemetry.ts`
 * (everything event-derived). Nothing here touches Prisma directly — each
 * owning module's own read is called instead, same rule AGENTS.md states
 * for `prisma.user`, applied to every other table this needs too.
 */
export type ParticipantTelemetrySummary = {
  id: string;
  /** #189 — the anonymous code this participant is referred to by in the paper. */
  studyId: string;
  displayName: string;
  email: string;
  abGroup: AbGroup;
  joinedAt: Date;
  sessionCount: number;
  totalTimeInAppMs: number;
  daysReturning: number;
  tasksCompleted: number;
  storeVisits: number;
  itemsViewed: number;
  itemsAddedToCart: number;
  itemsPurchased: number;
  avgTimeOnStorePageMs: number;
};

async function summaryFor(
  participant: ParticipantSummary,
): Promise<ParticipantTelemetrySummary> {
  const [session, funnel, tasksCompleted, itemsPurchased] = await Promise.all([
    sessionMetricsForUser(participant.id),
    storeFunnelForUser(participant.id),
    completedTaskCount(participant.id),
    purchaseCount(participant.id),
  ]);

  return {
    id: participant.id,
    studyId: participant.studyId,
    displayName: displayNameFor(participant),
    email: participant.email,
    abGroup: participant.abGroup,
    joinedAt: participant.createdAt,
    tasksCompleted,
    itemsPurchased,
    ...session,
    ...funnel,
  };
}

/** ADM-06 — `GET /api/admin/users`'s data: every participant, one row each. */
export async function participantSummaries(): Promise<ParticipantTelemetrySummary[]> {
  const participants = await listParticipants();
  return Promise.all(participants.map(summaryFor));
}

/** ADM-07 — a single participant's summary plus their 14-day activity sparkline. */
export type ParticipantTelemetryDetail = ParticipantTelemetrySummary & {
  dailyActivity: DailyActivity[];
};

/** Null for an unknown id or the admin's own account — neither is a participant row. */
export async function participantTelemetryDetail(
  userId: string,
): Promise<ParticipantTelemetryDetail | null> {
  const participant = await findUserById(userId);
  if (!participant || participant.role !== UserRole.PARTICIPANT) return null;

  const [summary, dailyActivity] = await Promise.all([
    summaryFor(participant),
    dailyActivityForUser(userId),
  ]);

  return { ...summary, dailyActivity };
}

/** ADM-08 — one arm's aggregate, averaged/summed across its participants. */
export type GroupAggregate = {
  group: AbGroup;
  participantCount: number;
  avgStoreVisits: number;
  /** Purchases ÷ items viewed, across the whole group — 0 with no views yet. */
  avgConversionRate: number;
};

function aggregateGroup(
  group: AbGroup,
  rows: ParticipantTelemetrySummary[],
): GroupAggregate {
  const inGroup = rows.filter((row) => row.abGroup === group);
  const participantCount = inGroup.length;

  const avgStoreVisits =
    participantCount === 0
      ? 0
      : inGroup.reduce((sum, row) => sum + row.storeVisits, 0) / participantCount;

  const totalViewed = inGroup.reduce((sum, row) => sum + row.itemsViewed, 0);
  const totalPurchased = inGroup.reduce((sum, row) => sum + row.itemsPurchased, 0);
  const avgConversionRate = totalViewed === 0 ? 0 : totalPurchased / totalViewed;

  return { group, participantCount, avgStoreVisits, avgConversionRate };
}

/**
 * ADM-08 — `GET /api/admin/aggregate`'s data: study-wide totals plus a
 * Group A vs Group B breakdown for each metric there's real data for.
 *
 * Deliberately has no "perceived trust" field — ADM-12 documents that no
 * instrument for it exists yet, and the design mock's 5.3-vs-3.7 bar has
 * nothing behind it. Adding a fabricated number here would be worse than
 * the gap it's meant to fill.
 */
export type StudyAggregate = {
  participantCount: number;
  telemetryEventCount: number;
  tasksCompletedCount: number;
  purchasesCount: number;
  groups: [GroupAggregate, GroupAggregate];
};

export async function studyAggregate(): Promise<StudyAggregate> {
  const [summaries, telemetryEventCount] = await Promise.all([
    participantSummaries(),
    totalTelemetryEventCount(),
  ]);

  return {
    participantCount: summaries.length,
    telemetryEventCount,
    tasksCompletedCount: summaries.reduce((sum, row) => sum + row.tasksCompleted, 0),
    purchasesCount: summaries.reduce((sum, row) => sum + row.itemsPurchased, 0),
    groups: [aggregateGroup(AbGroup.A, summaries), aggregateGroup(AbGroup.B, summaries)],
  };
}

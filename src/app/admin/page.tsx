import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { LogoutButton } from "@/components/auth/logout-button";
import { participantSummaries, requireAdmin, studyAggregate } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Admin · TaskTails",
};

/**
 * ADM-01 — the admin/researcher dashboard, restricted to the `ADMIN` role.
 *
 * Reuses `requireAdmin()` (ADM-09) rather than a separate page-only check —
 * one gate for both the page and every `/api/admin/*` route. Signed-out goes
 * to `/login` same as every other protected page; a signed-in non-admin (a
 * real study participant hitting this URL) goes to `/tasks` rather than a
 * dedicated "forbidden" screen, since nothing in the designs draws one and a
 * participant has no reason to be told this route exists at all.
 *
 * Desktop-first, not `AppShell`: the design (`TaskTails Screens.dc.html`'s
 * "Admin / researcher dashboard" group) draws this as plain desktop cards
 * with no phone frame, and INF-22 confirms the admin cards are already
 * desktop-first and out of scope for the mobile-adaptation pass. Reusing the
 * phone-frame shell here would fight the one screen that isn't supposed to
 * have one.
 */
export default async function AdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    redirect(gate.status === 401 ? "/login" : "/tasks");
  }

  const [participants, aggregate] = await Promise.all([
    participantSummaries(),
    studyAggregate(),
  ]);

  return (
    <AdminDashboard
      participants={participants}
      aggregate={aggregate}
      logoutSlot={<LogoutButton fullWidth={false} />}
    />
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { QuestChecklist } from "@/components/onboarding/quest-checklist";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { redirectAdminsAway } from "@/lib/admin";
import { onboardingStatus } from "@/lib/onboarding";
import { displayNameFor, findUserByEmail } from "@/lib/users";

export const metadata: Metadata = {
  title: "Your first three quests · TaskTails",
  description: "The three quests that introduce TaskTails.",
};

/**
 * ONB-01 — the onboarding checklist, where the register flow lands.
 *
 * No header and no bottom nav, matching the frame: this is still part of the
 * welcome flow, and its one way out is "Let's go". The design's frame uses a
 * warm fill here, but every screen's background was moved to plain white at
 * the user's request, so this one no longer carries `bg-warm` either.
 */
export default async function OnboardingPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) redirect("/login");
  await redirectAdminsAway(userId);

  const [record, status] = await Promise.all([
    findUserByEmail(email),
    onboardingStatus(userId),
  ]);
  if (!record) redirect("/login");

  return (
    <AppShell className="px-[22px] pt-[22px] pb-6">
      <SessionTracker />
      <QuestChecklist name={displayNameFor(record)} status={status} />
    </AppShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AccountCard } from "@/components/settings/account-card";
import { SettingsToggleCard } from "@/components/settings/settings-toggle-card";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { redirectAdminsAway } from "@/lib/admin";
import { settingsForUser } from "@/lib/settings";
import { findUserByEmail } from "@/lib/users";

export const metadata: Metadata = {
  title: "Settings · TaskTails",
};

/**
 * The Settings screen — grouped ACCOUNT/NOTIFICATIONS/PREFERENCES cards
 * (PRO-10), backed by PRO-13/14/15's toggles and PRO-11/12's password
 * screen, plus AUTH-03 (log out) and the research-consent note (PRO-16 —
 * already present since AUTH-03 built this screen, study copy rather than a
 * feature with its own state).
 */
export default async function SettingsPage() {
  const session = await auth();
  const email = session?.user?.email;
  const userId = session?.user?.id;
  if (!email || !userId) redirect("/login");
  await redirectAdminsAway(userId);

  const [record, settings] = await Promise.all([
    findUserByEmail(email),
    settingsForUser(userId),
  ]);
  if (!record) redirect("/login");

  return (
    <AppShell
      className="px-4 pt-[10px] pb-[14px]"
      nav={<BottomNav />}
      header={
        <header
          // 8px top / 18px sides / 14px bottom per the mock's back-chevron
          // header frames, safe-area-aware on top same as `AppHeader`.
          className="flex flex-none items-center gap-3 border-b border-border-track px-[18px] py-[14px]"
        >
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="font-display text-[17px] leading-[1.15] font-semibold">
            Settings
          </h1>
        </header>
      }
    >
      <SessionTracker />

      <div className="flex flex-col gap-4">
        <AccountCard email={record.email} />

        <SettingsToggleCard
          title="Notifications"
          rows={[
            { key: "dailyReminder", label: "Daily task reminder" },
            { key: "streakAlert", label: "Streak at risk alert" },
          ]}
          initialValues={{
            dailyReminder: settings?.dailyReminder ?? true,
            streakAlert: settings?.streakAlert ?? true,
          }}
        />

        <SettingsToggleCard
          title="Preferences"
          rows={[
            { key: "soundEffects", label: "Sound effects" },
            { key: "reduceMotion", label: "Reduce motion" },
          ]}
          initialValues={{
            soundEffects: settings?.soundEffects ?? false,
            reduceMotion: settings?.reduceMotion ?? false,
          }}
        />
      </div>

      <div className="min-h-2 flex-1" />

      <p className="mb-2 rounded-[11px] bg-violet-tint px-[11px] py-[9px] text-[10.5px] leading-[1.45] text-violet-text">
        <b className="font-extrabold">Research participant.</b> Anonymous usage
        is logged for the IMY761 study. Contact the researcher to withdraw.
      </p>

      <LogoutButton />
    </AppShell>
  );
}

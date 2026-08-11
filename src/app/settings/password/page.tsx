import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { redirectAdminsAway } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Change password · TaskTails",
};

/**
 * PRO-11 — the screen behind Settings' "Change password" row. No frame in
 * `design_handoff` draws this (the mock's Settings row just carries a `›`
 * implying a sub-screen), so it's built from the app's existing input/button
 * primitives rather than invented from nothing — the same fields and layout
 * `RegisterForm` uses for its own password pair.
 */
export default async function ChangePasswordPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session?.user?.email || !userId) redirect("/login");
  await redirectAdminsAway(userId);

  return (
    <AppShell
      className="px-4 pt-[10px] pb-[14px]"
      nav={<BottomNav />}
      header={
        <header className="flex flex-none items-center gap-3 border-b border-border-track px-[18px] p-3">
          <Link
            href="/settings"
            aria-label="Back to settings"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="font-display text-[17px] leading-[1.15] font-semibold">
            Change password
          </h1>
        </header>
      }
    >
      <SessionTracker />
      <ChangePasswordForm />
    </AppShell>
  );
}

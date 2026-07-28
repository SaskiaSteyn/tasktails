import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata: Metadata = {
  title: "Settings · TaskTails",
};

/**
 * Partial Settings screen — the shell plus AUTH-03 (log out), which is where the
 * designs put it.
 *
 * The designed frame also carries ACCOUNT (email, change password),
 * NOTIFICATIONS and PREFERENCES rows. None of those have tickets or anything to
 * write to yet, so the screen ships as the route that owns Log out and grows the
 * rest later. The research-consent note is here because it is study copy, not a
 * feature — participants need the withdrawal line wherever they land.
 */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  return (
    <main className="flex flex-1 justify-center bg-board sm:items-center sm:p-6">
      <div className="flex w-full flex-col bg-surface sm:min-h-[640px] sm:max-w-[400px] sm:overflow-hidden sm:rounded-frame sm:border sm:border-[rgb(46_42_38/0.06)] sm:shadow-card">
        <header className="flex items-center gap-3 border-b border-border-track px-[18px] pt-2 pb-[14px]">
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

        <div className="flex flex-1 flex-col px-4 pt-[10px] pb-[14px]">
          <p className="text-center text-[10.5px] leading-[1.4] text-ink-faint">
            Account, notification and preference settings are still to be built.
          </p>

          <div className="min-h-2 flex-1" />

          <p className="mb-2 rounded-[11px] bg-violet-tint px-[11px] py-[9px] text-[10.5px] leading-[1.45] text-violet-text">
            <b className="font-extrabold">Research participant.</b> Anonymous
            usage is logged for the IMY761 study. Contact the researcher to
            withdraw.
          </p>

          <LogoutButton />
        </div>
      </div>
    </main>
  );
}

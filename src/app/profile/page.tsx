import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UsernameCard } from "@/components/profile/username-card";
import { displayNameFor, findUserByEmail } from "@/lib/users";

export const metadata: Metadata = {
  title: "Profile · TaskTails",
};

/**
 * Partial Profile screen — AUTH-07 (change your username).
 *
 * The designed Profile frame also carries an avatar, lifetime stats, buy-XP and
 * achievements; those belong to their own tickets and are deliberately absent.
 * The frame's "STUDY GROUP B" chip is left out on purpose too: AUTH-04 keeps the
 * assignment off the wire because participants must not learn which arm they are
 * in, and a chip on their own profile would undo that.
 *
 * The gear in the banner is not in the handoff frames — it was added because
 * nothing in the designs routes to Settings, and Settings is where "Log out"
 * lives (AUTH-03).
 */
export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const record = await findUserByEmail(email);
  if (!record) redirect("/login");

  return (
    <AppShell
      className="px-4 pt-4 pb-[14px]"
      nav={<BottomNav />}
      header={
        <header className="flex flex-none items-center gap-[13px] border-b border-border-track bg-warm px-[18px] pt-[14px] pb-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[19px] leading-[1.1] font-semibold">
              {displayNameFor(record)}
            </h1>
            <p className="truncate text-[11.5px] text-ink-soft">
              {record.email}
            </p>
          </div>

          <Link
            href="/settings"
            aria-label="Settings"
            className="flex size-9 flex-none items-center justify-center rounded-full border border-border-track bg-surface text-ink-soft shadow-nav-idle transition-colors duration-120 ease-out hover:bg-warm hover:text-ink"
          >
            <Settings size={18} strokeWidth={2} aria-hidden />
          </Link>
        </header>
      }
    >
      <UsernameCard username={record.username ?? displayNameFor(record)} />

      <div className="min-h-2 flex-1" />

      <p className="text-center text-[10.5px] leading-[1.4] text-ink-faint">
        The rest of this screen — your photo, stats, achievements and your
        sanctuary — is still to be built.
      </p>
    </AppShell>
  );
}

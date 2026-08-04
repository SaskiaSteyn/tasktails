import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { achievementsForUser } from "@/lib/achievements";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AchievementsGrid } from "@/components/profile/achievements-grid";
import { BuyXpCard } from "@/components/profile/buy-xp-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { StatsGrid } from "@/components/profile/stats-grid";
import { UsernameCard } from "@/components/profile/username-card";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { redirectAdminsAway } from "@/lib/admin";
import { currentEconomy } from "@/lib/economy";
import { BUY_XP_COST_COINS, BUY_XP_GAIN_XP } from "@/lib/rewards";
import { lifetimeStatsFor } from "@/lib/stats";
import { displayNameFor, findUserByEmail } from "@/lib/users";

export const metadata: Metadata = {
  title: "Profile · TaskTails",
};

/**
 * The Profile screen — PRO-01 (banner), PRO-04 (lifetime stats), PRO-06
 * (buy XP), PRO-07 (achievements) and AUTH-07 (change your username). Every
 * section the designed frame draws now has one.
 *
 * The gear in the banner is not in the handoff frames — it was added because
 * nothing in the designs routes to Settings, and Settings is where "Log out"
 * lives (AUTH-03).
 */
export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user?.email;
  const userId = session?.user?.id;
  if (!email || !userId) redirect("/login");
  await redirectAdminsAway(userId);

  const [record, economy, stats, achievements] = await Promise.all([
    findUserByEmail(email),
    currentEconomy(),
    lifetimeStatsFor(userId),
    achievementsForUser(userId),
  ]);
  if (!record) redirect("/login");

  return (
    <AppShell
      className="px-4 pt-4 pb-[14px]"
      nav={<BottomNav />}
      header={
        <header className="flex flex-none items-center gap-[13px] border-b border-border-track bg-warm px-[18px] pt-[14px] pb-4">
          <ProfileHeader
            name={displayNameFor(record)}
            email={record.email}
            level={economy?.level ?? 1}
            avatarUrl={record.avatarUrl}
          />

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
      <SessionTracker />
      <UsernameCard username={record.username ?? displayNameFor(record)} />

      <div className="mt-4">
        <StatsGrid stats={stats} />
      </div>

      <div className="mt-4">
        <BuyXpCard
          costCoins={BUY_XP_COST_COINS}
          gainXp={BUY_XP_GAIN_XP}
          coins={economy?.coins ?? 0}
        />
      </div>

      <div className="mt-4">
        <AchievementsGrid achievements={achievements} />
      </div>

      <div className="min-h-2 flex-1" />
    </AppShell>
  );
}

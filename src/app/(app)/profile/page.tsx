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
import { RankButton } from "@/components/profile/rank-button";
import { SellItemsCard } from "@/components/profile/sell-items-card";
import { StatsGrid } from "@/components/profile/stats-grid";
import { UsernameCard } from "@/components/profile/username-card";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { redirectAdminsAway } from "@/lib/admin";
import { currentEconomy } from "@/lib/economy";
import { allTimeLeaderboard } from "@/lib/leaderboard";
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

  const [record, economy, stats, achievements, board] = await Promise.all([
    findUserByEmail(email),
    currentEconomy(),
    lifetimeStatsFor(userId),
    achievementsForUser(userId),
    allTimeLeaderboard(userId),
  ]);
  if (!record) redirect("/login");

  // PRO-18 — the Profile strip is a preview of the full 38-entry catalogue
  // now that PRO-09's original 4-achievement set no longer matches 1:1 with
  // what's rendered here; only the full list moved to its own screen.
  // Most-recently-unlocked first (real progress reads as more interesting
  // than the catalogue's fixed order), then locked entries in catalogue
  // order — `Array.prototype.sort` is stable, so ties among locked rows keep
  // the order `achievementsForUser()` already returned.
  //
  // Twelve, not the addendum's four: the strip fills the width from `desk:`
  // up (user's direction, 2026-08-30) and `AchievementsGrid` hides the tiles
  // each breakpoint has no room for. Sliced here rather than per breakpoint
  // because the server cannot know the viewport — twelve is simply the most
  // any width shows.
  const achievementsPreview = [...achievements]
    .sort((a, b) => {
      if (a.unlockedAt && b.unlockedAt) {
        return b.unlockedAt.getTime() - a.unlockedAt.getTime();
      }
      if (a.unlockedAt) return -1;
      if (b.unlockedAt) return 1;
      return 0;
    })
    .slice(0, 12);

  return (
    <AppShell
      // INF-22 — full width, as the handoff draws it: the page padding grows
      // and `StatsGrid` goes 4-up, the rest of the cards are full-bleed rows
      // at both widths.
      className="px-4 pt-4 pb-[14px] desk:px-[34px] desk:py-7"
      nav={<BottomNav />}
      header={
        <header className="flex flex-none items-center gap-[13px] border-b border-border-track bg-warm px-[18px] pt-[14px] pb-4">
          <ProfileHeader
            name={displayNameFor(record)}
            email={record.email}
            level={economy?.level ?? 1}
            studyId={record.studyId}
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

      {/* The identity banner again, in the body this time. `AppShell` hides
          the phone header at desktop widths and the universal header is
          title-and-status only, so without this the desktop Profile would be
          the one screen that never shows whose profile it is. Same component,
          second placement — exactly one of the two is ever visible. */}
      <div className="mb-6 hidden items-center gap-[13px] desk:flex">
        <ProfileHeader
          as="h2"
          name={displayNameFor(record)}
          email={record.email}
          level={economy?.level ?? 1}
          studyId={record.studyId}
          avatarUrl={record.avatarUrl}
        />
      </div>

      <UsernameCard username={record.username ?? displayNameFor(record)} />

      <div className="mt-4">
        <StatsGrid stats={stats} />
      </div>

      {/* LEAD-08 — between the stats grid and Buy XP, as the addendum draws it.
          Hidden rather than shown empty when this account somehow isn't ranked:
          a card that says "Your rank" with nothing in it is worse than no card,
          and `you` is only ever null for a non-participant, who is redirected
          away above. */}
      {board.you ? (
        <div className="mt-4">
          <RankButton
            rank={board.you.rank}
            participantCount={board.participantCount}
            scored={board.you.score > 0}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-[10px]">
        <BuyXpCard
          costCoins={BUY_XP_COST_COINS}
          gainXp={BUY_XP_GAIN_XP}
          coins={economy?.coins ?? 0}
        />
        <SellItemsCard />
      </div>

      <div className="mt-4">
        <AchievementsGrid achievements={achievementsPreview} />
      </div>

      <div className="min-h-2 flex-1" />
    </AppShell>
  );
}

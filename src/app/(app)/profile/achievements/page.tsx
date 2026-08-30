import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { AchievementsList } from "@/components/profile/achievements-list";
import { achievementsForUser } from "@/lib/achievements";

export const metadata: Metadata = {
  title: "Achievements · TaskTails",
};

/**
 * PRO-18 — the full Achievements screen, per
 * `design_handoff/ADDENDUM-achievements.md`. Reached from
 * `Profile → "See all ›"` (`AchievementsGrid`'s new header link);
 * back chevron returns there. No `BottomNav` — a drill-in from Profile,
 * same "focused flow, not tab content" call `PurchaseHistoryPage`/
 * `LuckyBoxOddsPage` already make for their own bespoke headers.
 *
 * Server component reads the full 38-entry catalogue once
 * (`achievementsForUser()`, already carrying `category`/`progress` per
 * achievement) and hands it to `AchievementsList` for client-side tab
 * filtering — cheap at this scale, no per-tab fetch needed.
 *
 * The "N / 38" pill's count is unlocked-achievements / catalogue size,
 * matching the addendum's "pill count = unlocked / total" note — and the
 * same underlying `achievementsForUser()` data source `AchievementsGrid`'s
 * Profile preview and this pill both derive from, kept in sync by
 * construction rather than by convention.
 */
export default async function AchievementsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const achievements = await achievementsForUser(userId);
  const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <AppShell
      header={
        <header className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] py-[14px]">
          <Link
            href="/profile"
            aria-label="Back to Profile"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-[19px] leading-[1.15] font-semibold">
            Achievements
          </h1>
          <span className="flex-none rounded-pill bg-sage-tint px-[10px] py-[3px] text-[11px] font-extrabold text-sage-text">
            {unlockedCount} / {achievements.length}
          </span>
        </header>
      }
      className="flex flex-col p-[14px] desk:px-[34px] desk:py-7"
    >
      {/* The unlocked count from the phone header, which is hidden at desktop
          widths — the universal header is title-and-status only. */}
      <p className="mb-4 hidden flex-none text-[12.5px] font-bold text-ink-soft desk:block">
        {unlockedCount} of {achievements.length} unlocked
      </p>
      <AchievementsList achievements={achievements} />
    </AppShell>
  );
}

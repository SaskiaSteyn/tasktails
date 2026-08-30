import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PersistentHeader } from "@/components/layout/persistent-header";
import { NextQuestCard } from "@/components/onboarding/next-quest-card";
import { ZooGrid } from "@/components/pets/zoo-grid";
import { TaskList } from "@/components/tasks/task-list";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { redirectAdminsAway } from "@/lib/admin";
import {
  equippedAccessoriesForUser,
  equippedBackgroundsForUser,
} from "@/lib/inventory";
import { onboardingStatus } from "@/lib/onboarding";
import { petsForUser } from "@/lib/pets";
import { tasksForUser } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Tasks · TaskTails",
};

/**
 * TASK-01 — the task dashboard's list view.
 *
 * The header (greeting, coins, level, XP bar, streak) is TASK-06, already
 * built by INF-12 — `<PersistentHeader />`'s greeting variant is pixel-for-
 * pixel the Dashboard frame's header, so it's reused rather than rebuilt.
 *
 * Editing (TASK-03), deleting (TASK-04) and completing (TASK-05) a task are
 * separate tickets — this screen reads and, via `BottomNav`'s "+", creates.
 *
 * INF-22 gives it a second column from `xl:` — the desktop handoff's activity
 * panel, which is PET-01's zoo grid drawn beside the list rather than a new
 * screen's worth of widgets. Between `desk:` and `xl:` the panel sits below
 * the list instead, per the handoff's 900px behaviour. The pets, backgrounds
 * and accessories are the same three reads `/zoo` already does.
 *
 * **Three panels the handoff draws here are deliberately absent**, because
 * every one of them needs data the app does not keep and its README forbids
 * inventing: the four stat tiles ("coins earned today, +45 vs yesterday" — no
 * per-day earnings series exists), the "This week" bar chart (same), and the
 * "2 tasks from your next badge" card (achievement progress exists, a
 * "distance to next badge" ranking over it does not). The list's own filter
 * tabs (Today / Upcoming / All / Done), sort control and date group headers
 * are absent for the same reason `TaskList` already documents: TASK-01 is
 * "all tasks", ungrouped and unfiltered by date.
 */
export default async function TasksPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  await redirectAdminsAway(userId);

  const [tasks, onboarding, pets, backgrounds, accessories] = await Promise.all([
    tasksForUser(userId),
    onboardingStatus(userId),
    petsForUser(userId),
    equippedBackgroundsForUser(userId),
    equippedAccessoriesForUser(userId),
  ]);

  return (
    <AppShell
      header={<PersistentHeader />}
      nav={<BottomNav />}
      className="desk:flex-col desk:gap-7 desk:px-8 desk:py-[26px] xl:flex-row"
    >
      <SessionTracker />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col desk:min-h-fit">
        {/* Above `TaskList` rather than inside it: the list swaps itself for
            `EmptyTasksState` when there are no tasks, and that is exactly the
            moment a new participant most needs to see what the quests are. */}
        <NextQuestCard status={onboarding} />
        <TaskList tasks={tasks} onboarding={onboarding} />
      </div>

      <aside className="hidden flex-none flex-col gap-4 desk:flex xl:w-[400px]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[15.5px] font-semibold">Your zoo</h2>
          <Link href="/zoo" className="text-[12px] font-bold text-terracotta hover:text-terracotta-hover">
            See all
          </Link>
        </div>
        <ZooGrid
          pets={pets}
          backgrounds={backgrounds}
          accessories={accessories}
          className="desk:grid-cols-4 xl:grid-cols-2"
        />
      </aside>
    </AppShell>
  );
}

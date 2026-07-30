import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PersistentHeader } from "@/components/layout/persistent-header";
import { NextQuestCard } from "@/components/onboarding/next-quest-card";
import { TaskList } from "@/components/tasks/task-list";
import { onboardingStatus } from "@/lib/onboarding";
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
 */
export default async function TasksPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [tasks, onboarding] = await Promise.all([
    tasksForUser(userId),
    onboardingStatus(userId),
  ]);

  return (
    <AppShell header={<PersistentHeader />} nav={<BottomNav />}>
      {/* Above `TaskList` rather than inside it: the list swaps itself for
          `EmptyTasksState` when there are no tasks, and that is exactly the
          moment a new participant most needs to see what the quests are. */}
      <NextQuestCard status={onboarding} />
      <TaskList tasks={tasks} onboarding={onboarding} />
    </AppShell>
  );
}

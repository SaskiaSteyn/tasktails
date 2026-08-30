import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { EditTaskForm } from "@/components/tasks/edit-task-form";
import { taskForUser } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Edit task · TaskTails",
};

/**
 * TASK-03 — task detail / edit screen. A full screen, not a modal, per the
 * ticket's own text.
 *
 * `taskForUser` scopes the lookup to the signed-in user, so a task id that
 * exists but belongs to someone else reads the same as one that doesn't
 * exist at all — back to the list rather than a 404 or a 403 that would
 * confirm the id was valid.
 */
export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const { id } = await params;
  const task = await taskForUser(userId, id);
  if (!task) redirect("/tasks");

  return (
    <AppShell
      header={
        <header
          // 8px top / 18px sides / 14px bottom, safe-area-aware — see the
          // note on this same header shape in settings/page.tsx.
          className="flex flex-none items-center gap-3 border-b border-border-track px-[18px] py-[14px]"
        >
          <Link
            href="/tasks"
            aria-label="Back to tasks"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="font-display text-[17px] leading-[1.15] font-semibold">
            Edit task
          </h1>
        </header>
      }
    >
      <EditTaskForm task={task} />
    </AppShell>
  );
}

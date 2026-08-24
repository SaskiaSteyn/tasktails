"use client";

import { useState } from "react";

import { CreateTaskSheet } from "@/components/tasks/create-task-sheet";

/**
 * The "Empty tasks" state (`design_handoff`, Shared/States — SHR-04's exact
 * design, built here as part of TASK-01). Its own `CreateTaskSheet` instance
 * rather than sharing `BottomNav`'s: the sheet is a controlled, stateless-
 * between-opens component, so two independent triggers for it are simpler
 * than wiring cross-component state for a screen with no other shared data.
 *
 * `hasCompletedTasks` (**added 2026-08-25, issue #199**) swaps the subtitle:
 * `TaskList` renders this component at two different moments — genuinely no
 * tasks ever, and no *active* tasks with completed history sitting right
 * below in the collapsed section — and the design mock only ever drew the
 * first. "No tasks yet" read as wrong for the second (a participant who has
 * already completed several tasks has not, in fact, added none yet), so it
 * gets its own congratulatory copy instead. Defaults to `false` — the
 * `tasks.length === 0` call site never has history to reflect, so it doesn't
 * need to pass anything.
 */
export function EmptyTasksState({
  hasCompletedTasks = false,
}: {
  hasCompletedTasks?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div
        aria-hidden
        className="mb-4 flex size-16 items-center justify-center rounded-card-lg border-2 border-dashed border-checkbox bg-input"
      >
        <div className="size-6 rounded-[7px] border-[3px] border-checkbox" />
      </div>
      <p className="font-display text-[17px] font-semibold">All clear!</p>
      <p className="mt-[6px] mb-[18px] text-[12.5px] text-ink-soft">
        {hasCompletedTasks
          ? "Nice work — you're all caught up! Add another task whenever you're ready."
          : "No tasks yet. Add your first to start earning coins."}
      </p>
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="rounded-input bg-terracotta px-5 py-[10.5px] font-display text-[14px] font-semibold text-white shadow-btn transition-all duration-120 ease-out hover:bg-terracotta-hover"
      >
        New task
      </button>

      <CreateTaskSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

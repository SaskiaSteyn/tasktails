"use client";

import { useState } from "react";

import { CreateTaskSheet } from "@/components/tasks/create-task-sheet";

/**
 * The "Empty tasks" state (`design_handoff`, Shared/States — SHR-04's exact
 * design, built here as part of TASK-01). Its own `CreateTaskSheet` instance
 * rather than sharing `BottomNav`'s: the sheet is a controlled, stateless-
 * between-opens component, so two independent triggers for it are simpler
 * than wiring cross-component state for a screen with no other shared data.
 */
export function EmptyTasksState() {
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
        No tasks yet. Add your first to start earning coins.
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

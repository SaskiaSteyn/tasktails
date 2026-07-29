"use client";

import { useEffect, useState } from "react";

import { EmptyTasksState } from "@/components/tasks/empty-tasks-state";
import { TaskRow } from "@/components/tasks/task-row";
import type { Task } from "@/lib/tasks";

/**
 * TASK-01/TASK-05 — the task list, its empty state (`EmptyTasksState`,
 * SHR-04's design, built as part of TASK-01), and completion toggling.
 *
 * Completion state is local-only (`useState` seeded from the server-rendered
 * `tasks` prop) — TASK-11 doesn't exist, so there's nowhere to persist a
 * toggle. Reloading the page reverts to what's actually in the database.
 * Toggled rows deliberately don't re-sort to the bottom: TASK-01's ordering
 * is a server-side concern (`tasksForUser`), and jumping a row around the
 * list for a change that isn't even saved would be a strange thing to watch.
 *
 * Re-synced from `initialTasks` whenever that prop changes (adjusted during
 * render, not an effect — same pattern as `CreateTaskSheet`'s reset-on-open)
 * — TASK-08's create sheet calls `router.refresh()` on success, which
 * re-runs `tasksForUser()` and passes a new array down here. A stale local
 * toggle losing to that fresh fetch is correct: it was never saved either.
 *
 * One shared "not saved" notice for the whole list, not one per row — a
 * banner beside every row you tap would compete with the list itself for
 * attention far more than the single-instance notices TASK-02/03 show on
 * their own forms.
 */
export function TaskList({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showNotice, setShowNotice] = useState(false);

  const [syncedFrom, setSyncedFrom] = useState(initialTasks);
  if (initialTasks !== syncedFrom) {
    setSyncedFrom(initialTasks);
    setTasks(initialTasks);
  }

  useEffect(() => {
    if (!showNotice) return;
    const timer = setTimeout(() => setShowNotice(false), 3000);
    return () => clearTimeout(timer);
  }, [showNotice]);

  function handleToggle(taskId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, completedAt: task.completedAt ? null : new Date() }
          : task,
      ),
    );
    setShowNotice(true);
  }

  if (tasks.length === 0) return <EmptyTasksState />;

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-4 pt-4 pb-2">
      {/* The mock labels this section "TODAY", but TASK-01 is "all user tasks"
          (Requirements.md TASK-7) with no due-date filtering — a task due next
          week under a "TODAY" heading would be actively misleading. Omitted
          until a real date-grouped view is ticketed. */}
      <ul className="flex flex-col gap-[9px] overflow-y-auto">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            id={task.id}
            title={task.title}
            dueDate={task.dueDate}
            complexityTier={task.complexityTier}
            done={task.completedAt !== null}
            onToggle={() => handleToggle(task.id)}
          />
        ))}
      </ul>

      {showNotice ? (
        <p
          role="status"
          className="mt-3 flex-none text-center text-[11px] text-ink-soft"
        >
          Completing a task isn&apos;t connected yet (TASK-11) — this won&apos;t
          be saved.
        </p>
      ) : null}
    </div>
  );
}

import { TaskRow } from "@/components/tasks/task-row";
import type { Task } from "@/lib/tasks";

/**
 * TASK-01 — the task list itself, plus its empty state
 * (`design_handoff/TaskTails Screens.dc.html`, "Empty tasks").
 *
 * The empty state's "+ New task" pill is rendered inert (not a button or
 * link) — it opens the create-task sheet in the design, but that's TASK-02,
 * which doesn't exist yet. A control that looks clickable and does nothing
 * would be worse than one that's honestly just decoration for now.
 */
export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
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
        <span className="rounded-input bg-terracotta-disabled px-5 py-[10.5px] font-display text-[14px] font-semibold text-surface">
          + New task
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden px-4 pt-4 pb-2">
      {/* The mock labels this section "TODAY", but TASK-01 is "all user tasks"
          (Requirements.md TASK-7) with no due-date filtering — a task due next
          week under a "TODAY" heading would be actively misleading. Omitted
          until a real date-grouped view is ticketed. */}
      <ul className="flex flex-col gap-[9px]">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            title={task.title}
            dueDate={task.dueDate}
            complexityTier={task.complexityTier}
            done={task.completedAt !== null}
          />
        ))}
      </ul>
    </div>
  );
}

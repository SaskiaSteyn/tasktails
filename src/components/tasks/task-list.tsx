import { EmptyTasksState } from "@/components/tasks/empty-tasks-state";
import { TaskRow } from "@/components/tasks/task-row";
import type { Task } from "@/lib/tasks";

/**
 * TASK-01 — the task list itself. The empty state is `EmptyTasksState`
 * (`design_handoff`, Shared/States "Empty tasks" — SHR-04's design, built as
 * part of TASK-01).
 */
export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return <EmptyTasksState />;

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
            id={task.id}
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

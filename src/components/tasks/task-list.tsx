"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  useLevelUp,
  type LevelUpEventLike,
} from "@/components/economy/level-up-provider";
import { EmptyTasksState } from "@/components/tasks/empty-tasks-state";
import { TaskRow } from "@/components/tasks/task-row";
import type { Task } from "@/lib/tasks";

/** The pieces of TASK-11's response this component actually reads. */
type CompleteResponse = {
  task: { completedAt: string };
  reward: { granted: { coins: number; xp: number } } | null;
  levelUp: LevelUpEventLike | null;
  error?: string;
};

/**
 * TASK-01/TASK-05 — the task list, its empty state (`EmptyTasksState`,
 * SHR-04's design, built as part of TASK-01), and completion.
 *
 * Completing `POST`s TASK-11's `/api/tasks/[id]/complete` for real. There is
 * no un-complete — TASK-11 is forward-only (see its own file for why), so a
 * completed row's checkbox is disabled rather than toggling back.
 * `router.refresh()` on success re-runs `tasksForUser()` *and*
 * `currentEconomy()` for the header, so a completion updates the coin/XP/
 * streak the participant sees without a second round trip of its own.
 *
 * The reward pop shows the *actual* granted amount from the response, not
 * the tier's base figure `TaskRow` shows on the row itself — efficiency,
 * streak, anti-spam and the daily cap can all move it, and showing the base
 * number would be a small lie at the exact moment a participant is meant to
 * trust the number most.
 *
 * A level-up crossing goes straight to ECO-07's `useLevelUp().celebrate()`
 * — the provider is a no-op queue if the event is null, so this is safe to
 * call on every completion rather than needing its own guard.
 */
export function TaskList({ tasks: initialTasks }: { tasks: Task[] }) {
  const router = useRouter();
  const { celebrate } = useLevelUp();

  const [tasks, setTasks] = useState(initialTasks);
  const [syncedFrom, setSyncedFrom] = useState(initialTasks);
  if (initialTasks !== syncedFrom) {
    setSyncedFrom(initialTasks);
    setTasks(initialTasks);
  }

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    taskId: string;
    coins: number;
    xp: number;
  } | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 900);
    return () => clearTimeout(timer);
  }, [celebration]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(undefined), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleComplete(taskId: string) {
    setCompletingId(taskId);
    setError(undefined);
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
      });
      const body = (await response.json()) as CompleteResponse;

      if (!response.ok) {
        setError(body.error ?? "Couldn't complete the task. Try again.");
        return;
      }

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? { ...task, completedAt: new Date(body.task.completedAt) }
            : task,
        ),
      );

      if (body.reward) {
        setCelebration({
          taskId,
          coins: body.reward.granted.coins,
          xp: body.reward.granted.xp,
        });
      }
      celebrate(body.levelUp);
      router.refresh();
    } catch {
      setError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setCompletingId(null);
    }
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
            pending={completingId === task.id}
            celebrationReward={
              celebration?.taskId === task.id
                ? { coins: celebration.coins, xp: celebration.xp }
                : null
            }
            onComplete={() => handleComplete(task.id)}
          />
        ))}
      </ul>

      {error ? (
        <p
          role="alert"
          className="mt-3 flex-none text-center text-[11px] font-bold text-urgency-text"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

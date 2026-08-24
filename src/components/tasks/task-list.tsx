"use client";

import { Check, ChevronDown, PartyPopper } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  useAchievementUnlock,
  type AchievementUnlockLike,
} from "@/components/economy/achievement-unlock-provider";
import {
  useLevelUp,
  type LevelUpEventLike,
} from "@/components/economy/level-up-provider";
import { EmptyTasksState } from "@/components/tasks/empty-tasks-state";
import { TaskRow } from "@/components/tasks/task-row";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import type { OnboardingStatus } from "@/lib/onboarding";
import { taskTier } from "@/lib/task-tiers";
import type { TaskWithSubtasks } from "@/lib/tasks";

/** The pieces of TASK-11's response this component actually reads. */
type CompleteResponse = {
  task: { completedAt: string };
  reward: { granted: { coins: number; xp: number } } | null;
  levelUp: LevelUpEventLike | null;
  achievementsUnlocked: AchievementUnlockLike[];
  error?: string;
};

/** The pieces of SUB-05's response this component actually reads. */
type CompleteSubtaskResponse = {
  subtask: { completedAt: string };
  task: { completedAt: string } | null;
  reward: { granted: { coins: number; xp: number } } | null;
  levelUp: LevelUpEventLike | null;
  achievementsUnlocked: AchievementUnlockLike[];
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
 * **Confirm-before-complete (2026-08-12), at the user's request**: since
 * there's no un-complete, an accidental tap used to be permanent with no
 * recourse. A tap on either kind of row's checkbox no longer fires the
 * request directly — it opens the shared `Modal` (same pattern as
 * `EditTaskForm`'s "Delete task") naming the row, and only `onConfirm` calls
 * `handleCompleteTask`/`handleCompleteSubtask`. `pendingComplete` carries
 * enough to route to the right handler and word the dialog (`kind` picks the
 * request; `taskId` is only present for a subtask, whose endpoint needs its
 * parent's id).
 *
 * The reward pop shows the *actual* granted amount from the response, not
 * the tier's base figure `TaskRow` shows on the row itself — efficiency,
 * streak, anti-spam and the daily cap can all move it, and showing the base
 * number would be a small lie at the exact moment a participant is meant to
 * trust the number most.
 *
 * A level-up crossing goes straight to ECO-07's `useLevelUp().celebrate()`
 * — the provider is a no-op queue if the event is null, so this is safe to
 * call on every completion rather than needing its own guard. Any newly
 * unlocked badges go the same way to `useAchievementUnlock().celebrate()`.
 *
 * **Subtasks (2026-07-30)** render nested under their parent via the same
 * `TaskRow`, indented, and complete for real through SUB-05's
 * `/api/tasks/[id]/subtasks/[subId]/complete` — previously only reachable
 * from the edit screen's `SubtaskList`. `router.refresh()` after a subtask
 * completion picks up SUB-4's auto-complete of the parent the same way it
 * already picks up a level-up or a coin change: by re-running `tasksForUser()`
 * (now including subtasks) rather than this component reconciling the two
 * completion states itself.
 *
 * **Completed section (2026-07-30)**, collapsed by default, added because
 * finished tasks never left the flat list and the dashboard read as more and
 * more crowded the longer someone used the app. Collapsing rather than
 * deleting on request: a completed task backs `completedTaskCount()`
 * (ONB-01's "Complete a task" quest, and PRO-04/PRO-09's planned lifetime
 * stats and achievement criteria), so silently discarding history that other
 * features already depend on would be the wrong default. Deleting a task for
 * real is still one tap away on its edit screen (TASK-04) for anyone who
 * actually wants it gone, not just out of the way.
 *
 * **ONB-02** — a small celebration when an onboarding goal is met. The three
 * goals are each satisfied by an action on a different screen (creating a
 * task, completing one, eventually buying a pet), so there's no single place
 * that "witnesses" a goal being met the way `TaskRow`'s reward pop witnesses
 * a completion. What every path *does* share is `router.refresh()`, which
 * re-runs `/tasks`'s server component and hands this component a fresh
 * `onboarding` prop — so this diffs that prop against what it was on the
 * previous render, rather than each action site knowing about onboarding
 * goals individually. That also means "Add a task" fires correctly even
 * though the request that satisfies it happens inside `CreateTaskSheet`, not
 * here: that component's own `router.refresh()` is what re-renders this one.
 *
 * Only fires for a goal met *during this session* — same limitation
 * `LevelUpProvider` already has for level-ups, and for the same reason: there
 * is no "missed celebration" queue, only a before/after diff on live renders.
 * A goal already met when the page first loads is correctly silent rather
 * than replaying stale news.
 */
export function TaskList({
  tasks: initialTasks,
  onboarding,
}: {
  tasks: TaskWithSubtasks[];
  onboarding: OnboardingStatus;
}) {
  const router = useRouter();
  const { celebrate } = useLevelUp();
  const { celebrate: celebrateAchievements } = useAchievementUnlock();

  const [tasks, setTasks] = useState(initialTasks);
  const [syncedFrom, setSyncedFrom] = useState(initialTasks);
  if (initialTasks !== syncedFrom) {
    setSyncedFrom(initialTasks);
    setTasks(initialTasks);
  }

  const [priorOnboarding, setPriorOnboarding] = useState(onboarding);
  const [questCelebration, setQuestCelebration] = useState<string[] | null>(
    null,
  );
  if (onboarding !== priorOnboarding) {
    const newlyMet = onboarding.goals
      .filter((goal) => goal.complete)
      .filter(
        (goal) =>
          !priorOnboarding.goals.find((prior) => prior.key === goal.key)
            ?.complete,
      )
      .map((goal) => goal.label);
    if (newlyMet.length > 0) setQuestCelebration(newlyMet);
    setPriorOnboarding(onboarding);
  }

  useEffect(() => {
    if (!questCelebration) return;
    const timer = setTimeout(() => setQuestCelebration(null), 3200);
    return () => clearTimeout(timer);
  }, [questCelebration]);

  // Shared between task and subtask rows — a subtask id can never collide
  // with a task id (separate cuid sequences), so one map serves both without
  // needing to track which kind of thing is currently completing.
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    id: string;
    coins: number;
    xp: number;
  } | null>(null);
  const [error, setError] = useState<string>();
  const [showCompleted, setShowCompleted] = useState(false);
  const [pendingComplete, setPendingComplete] = useState<
    | { kind: "task"; id: string; title: string }
    | { kind: "subtask"; taskId: string; id: string; title: string }
    | null
  >(null);

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

  async function handleCompleteTask(taskId: string) {
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
          id: taskId,
          coins: body.reward.granted.coins,
          xp: body.reward.granted.xp,
        });
      }
      celebrate(body.levelUp);
      celebrateAchievements(body.achievementsUnlocked);
      router.refresh();
    } catch {
      setError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setCompletingId(null);
    }
  }

  /**
   * SUB-05. `taskId` is needed for the URL — a `Subtask` has no route of its
   * own — but the optimistic patch and the celebration key off `subtaskId`.
   */
  async function handleCompleteSubtask(taskId: string, subtaskId: string) {
    setCompletingId(subtaskId);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/subtasks/${subtaskId}/complete`,
        { method: "POST" },
      );
      const body = (await response.json()) as CompleteSubtaskResponse;

      if (!response.ok) {
        setError(body.error ?? "Couldn't complete the subtask. Try again.");
        return;
      }

      setTasks((current) =>
        current.map((task) => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            // SUB-4 may have auto-completed the parent in the same request.
            completedAt: body.task
              ? new Date(body.task.completedAt)
              : task.completedAt,
            subtasks: task.subtasks.map((subtask) =>
              subtask.id === subtaskId
                ? { ...subtask, completedAt: new Date(body.subtask.completedAt) }
                : subtask,
            ),
          };
        }),
      );

      if (body.reward) {
        setCelebration({
          id: subtaskId,
          coins: body.reward.granted.coins,
          xp: body.reward.granted.xp,
        });
      }
      celebrate(body.levelUp);
      celebrateAchievements(body.achievementsUnlocked);
      router.refresh();
    } catch {
      setError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setCompletingId(null);
    }
  }

  if (tasks.length === 0) return <EmptyTasksState />;

  // `tasksForUser()` already sorts incomplete first, so this split preserves
  // each half's own relative order rather than re-sorting anything.
  const activeTasks = tasks.filter((task) => task.completedAt === null);
  const doneTasks = tasks.filter((task) => task.completedAt !== null);

  /** One task's row plus its (possibly empty) nested subtask list. */
  function taskGroup(task: TaskWithSubtasks) {
    const tier = taskTier(task.complexityTier);
    const shareCoins =
      task.subtasks.length > 0
        ? Math.floor(tier.coins / task.subtasks.length)
        : 0;

    return (
      <li key={task.id} className="flex flex-col gap-[9px]">
        <TaskRow
          title={task.title}
          href={`/tasks/${task.id}`}
          dueDate={task.dueDate}
          complexityTier={task.complexityTier}
          coins={tier.coins}
          done={task.completedAt !== null}
          pending={completingId === task.id}
          celebrationReward={
            celebration?.id === task.id
              ? { coins: celebration.coins, xp: celebration.xp }
              : null
          }
          onComplete={() =>
            setPendingComplete({ kind: "task", id: task.id, title: task.title })
          }
        />

        {task.subtasks.length > 0 ? (
          <ul className="flex flex-col gap-[9px]">
            {task.subtasks.map((subtask) => (
              <li key={subtask.id}>
                <TaskRow
                  title={subtask.title}
                  href={`/tasks/${task.id}`}
                  coins={shareCoins}
                  done={subtask.completedAt !== null}
                  pending={completingId === subtask.id}
                  celebrationReward={
                    celebration?.id === subtask.id
                      ? { coins: celebration.coins, xp: celebration.xp }
                      : null
                  }
                  onComplete={() =>
                    setPendingComplete({
                      kind: "subtask",
                      taskId: task.id,
                      id: subtask.id,
                      title: subtask.title,
                    })
                  }
                  indent
                />
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-4 pt-4 pb-[14px]">
      {/* ONB-02. `role="status"` (not `role="alert"`) — good news, not an
          error, so it should announce without interrupting whatever the
          participant is doing. `aria-live="polite"` is `role="status"`'s
          default, no extra prop needed. */}
      {questCelebration ? (
        <div
          role="status"
          className="mb-3 flex flex-none items-center gap-2 rounded-card border border-sage/30 bg-sage-tint px-3 py-[10px] text-[12.5px] font-bold text-sage-text motion-safe:animate-medallion-pop"
        >
          <PartyPopper size={16} className="flex-none" aria-hidden />
          <span>Quest complete: {questCelebration.join(", ")}!</span>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {/* The mock labels this section "TODAY", but TASK-01 is "all user
            tasks" (Requirements.md TASK-7) with no due-date filtering — a task
            due next week under a "TODAY" heading would be actively
            misleading. Omitted until a real date-grouped view is ticketed. */}
        {activeTasks.length > 0 ? (
          <ul className="flex flex-col gap-[9px]">
            {activeTasks.map((task) => taskGroup(task))}
          </ul>
        ) : doneTasks.length > 0 ? (
          // Nothing open, but there's history below — still "all clear" for
          // what the participant actually has to do right now, with copy
          // that reflects the completed history instead of implying they've
          // never added a task (issue #199).
          <EmptyTasksState hasCompletedTasks />
        ) : null}

        {doneTasks.length > 0 ? (
          <div className="flex-none">
            <button
              type="button"
              onClick={() => setShowCompleted((current) => !current)}
              aria-expanded={showCompleted}
              className="flex w-full items-center gap-[6px] py-1 text-[11px] font-extrabold tracking-[0.4px] text-ink-soft"
            >
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform duration-120",
                  showCompleted && "rotate-180",
                )}
                aria-hidden
              />
              COMPLETED ({doneTasks.length})
            </button>

            {showCompleted ? (
              <ul className="mt-2 flex flex-col gap-[9px]">
                {doneTasks.map((task) => taskGroup(task))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 flex-none text-center text-[11px] font-bold text-urgency-text"
        >
          {error}
        </p>
      ) : null}

      <Modal
        open={pendingComplete !== null}
        icon={Check}
        iconTint="terracotta"
        title={pendingComplete ? `Complete "${pendingComplete.title}"?` : ""}
        body="You'll earn the coins and XP right away. There's no way to undo it afterward, so make sure this one's really done."
        confirmLabel="Complete"
        confirmVariant="primary"
        cancelLabel="Not yet"
        onConfirm={() => {
          if (!pendingComplete) return;
          if (pendingComplete.kind === "task") {
            handleCompleteTask(pendingComplete.id);
          } else {
            handleCompleteSubtask(pendingComplete.taskId, pendingComplete.id);
          }
          setPendingComplete(null);
        }}
        onCancel={() => setPendingComplete(null)}
      />
    </div>
  );
}

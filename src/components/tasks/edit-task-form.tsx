"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { DatePicker } from "@/components/tasks/date-picker";
import { TierSelect } from "@/components/tasks/tier-select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { taskTier, type TaskTier } from "@/lib/task-tiers";
import type { Task } from "@/lib/tasks";

/**
 * TASK-03 — task detail / edit screen. Pre-filled title, due date,
 * complexity, and a reward footer with delete + save.
 *
 * Subtasks are deliberately not on this screen — SUB-01/02/03 (list, add,
 * complete) are separate, unbuilt tickets, and a partial read-only subtask
 * list was ruled a worse middle ground than none at all.
 *
 * Save `PATCH`es TASK-09's `/api/tasks/[id]` for real (wired the same day
 * that ticket shipped) and returns to `/tasks` on success — the fresh
 * navigation is what re-fetches `tasksForUser()`, no explicit
 * `router.refresh()` needed the way TASK-02's sheet needs one to update the
 * page it stays on.
 *
 * Delete `DELETE`s TASK-10's `/api/tasks/[id]` for real too (wired the same
 * day that ticket shipped) — `Modal`'s (SHR-03) second consumer, after the
 * onboarding username step, now actually removes the task on confirm and
 * returns to `/tasks` rather than stopping on a notice.
 */
export function EditTaskForm({ task }: { task: Task }) {
  const router = useRouter();
  const formId = useId();
  const titleFieldId = useId();
  const titleErrorId = useId();
  const tierLabelId = useId();

  const [title, setTitle] = useState(task.title);
  const [tier, setTier] = useState<TaskTier["tier"]>(
    task.complexityTier as TaskTier["tier"],
  );
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate);
  const [titleError, setTitleError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const reward = taskTier(tier);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextTitleError = title.trim() ? undefined : "Give the task a title.";
    setTitleError(nextTitleError);
    if (nextTitleError) return;

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, complexityTier: tier, dueDate }),
      });

      if (!response.ok) {
        setSubmitError("Couldn't save changes. Try again.");
        return;
      }

      router.push("/tasks");
    } catch {
      setSubmitError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Closed either way: an error sitting behind an open confirm dialog
        // is invisible until the dialog is dismissed, so the footer message
        // is more useful shown immediately than kept waiting.
        setDeleteOpen(false);
        setDeleteError("Couldn't delete the task. Try again.");
        return;
      }

      setDeleteOpen(false);
      router.push("/tasks");
    } catch {
      setDeleteOpen(false);
      setDeleteError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-y-auto px-[18px] pt-[18px] pb-2"
      >
        <div className="mb-4">
          <label
            htmlFor={titleFieldId}
            className="text-[11px] font-extrabold tracking-[0.4px] text-ink-soft"
          >
            TITLE
          </label>
          <input
            id={titleFieldId}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleError(undefined);
            }}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? titleErrorId : undefined}
            className={cn(
              "mt-[6px] h-[46px] w-full rounded-input border px-[13px] text-[14px] font-bold text-ink outline-none",
              "transition-[background-color,border-color,box-shadow] duration-120",
              titleError
                ? "border-urgency bg-surface shadow-[0_0_0_1px_var(--color-urgency),0_0_0_5px_rgb(219_76_63/0.14)]"
                : cn(
                    "border-border-input bg-input",
                    "focus:border-terracotta focus:bg-surface",
                    "focus:shadow-[0_0_0_1px_var(--color-terracotta),0_0_0_5px_rgb(226_122_84/0.16)]",
                  ),
            )}
          />
          {titleError ? (
            <p id={titleErrorId} role="alert" className="mt-1 text-[11px] font-bold text-urgency-text">
              {titleError}
            </p>
          ) : null}
        </div>

        <div className="mb-4">
          <DatePicker value={dueDate} onChange={setDueDate} label="DUE DATE" />
        </div>

        <div className="mb-4">
          <div
            id={tierLabelId}
            className="mb-2 text-[11px] font-extrabold tracking-[0.4px] text-ink-soft"
          >
            COMPLEXITY
          </div>
          <TierSelect value={tier} onChange={setTier} labelledBy={tierLabelId} />
        </div>
      </form>

      <div className="flex-none border-t border-border-track bg-warm px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div className="mb-[10px] flex items-center justify-between text-[12px]">
          <span className="text-ink-soft">Reward on completion</span>
          <span className="font-extrabold text-amber-text">
            {reward.coins} coins · {reward.xp} XP
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete task"
            className="flex h-[46px] w-[48px] flex-none items-center justify-center rounded-input border border-urgency-border bg-surface text-urgency-text transition-colors duration-120 hover:border-urgency-border-hover hover:bg-urgency-tint"
          >
            <Trash2 size={18} strokeWidth={2.2} aria-hidden />
          </button>
          <Button
            type="submit"
            form={formId}
            size="dialog"
            fullWidth={false}
            className="flex-1"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {submitError ? (
          <p role="alert" className="mt-2 text-center text-[11px] font-bold text-urgency-text">
            {submitError}
          </p>
        ) : null}
        {deleteError ? (
          <p role="alert" className="mt-2 text-center text-[11px] font-bold text-urgency-text">
            {deleteError}
          </p>
        ) : null}
      </div>

      <Modal
        open={deleteOpen}
        icon={Trash2}
        iconTint="destructive"
        title="Delete this task?"
        body="This can't be undone — any progress on it is lost."
        confirmLabel={deleting ? "Deleting…" : "Delete task"}
        confirmVariant="destructive"
        cancelLabel="Keep task"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

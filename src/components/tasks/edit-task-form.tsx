"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { DatePicker } from "@/components/tasks/date-picker";
import { SubtaskList } from "@/components/tasks/subtask-list";
import { TierSelect } from "@/components/tasks/tier-select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { taskTier, type TaskTier } from "@/lib/task-tiers";
import type { TaskWithSubtasks } from "@/lib/tasks";

/**
 * TASK-03 — task detail / edit screen. Pre-filled title, due date,
 * complexity, subtask list (SUB-01), and a footer with delete + save.
 *
 * Subtask titles are part of this form (#273): `SubtaskList` renders them as
 * named inputs, submit reads them out of `FormData` and `PATCH`es the ones
 * that changed alongside the task itself. Adding, completing and deleting a
 * subtask stay immediate — they are actions, not fields — but a rename waits
 * for "Save changes" the same way the task's own title does.
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
export function EditTaskForm({ task }: { task: TaskWithSubtasks }) {
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
  // Keyed by subtask id. Raised by this form's own submit, exactly like
  // `titleError` above it — subtask titles are saved by "Save changes", not
  // by clicking out of one (user's direction, 2026-09-10).
  const [subtaskErrors, setSubtaskErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const reward = taskTier(tier);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Subtask titles are read straight out of the form rather than mirrored
    // into state on every keystroke — `SubtaskList` renders them as named
    // inputs inside this very form, so FormData already has them.
    const fields = new FormData(event.currentTarget as HTMLFormElement);
    const nextSubtaskErrors: Record<string, string> = {};
    const renames: { id: string; title: string }[] = [];

    for (const subtask of task.subtasks) {
      const raw = fields.get(`subtask-title-${subtask.id}`);
      if (typeof raw !== "string") continue;
      const next = raw.trim();

      if (!next) {
        nextSubtaskErrors[subtask.id] = "Give the subtask a title.";
      } else if (next !== subtask.title) {
        renames.push({ id: subtask.id, title: next });
      }
    }

    const nextTitleError = title.trim() ? undefined : "Give the task a title.";
    setTitleError(nextTitleError);
    setSubtaskErrors(nextSubtaskErrors);
    if (nextTitleError || Object.keys(nextSubtaskErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      // One round trip for the task and one per renamed subtask, together —
      // "Save changes" is a single action to the participant, so a rename
      // must not need a second press to stick.
      const responses = await Promise.all([
        fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, complexityTier: tier, dueDate }),
        }),
        ...renames.map((rename) =>
          fetch(`/api/tasks/${task.id}/subtasks/${rename.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: rename.title }),
          }),
        ),
      ]);

      if (responses.some((response) => !response.ok)) {
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
    // INF-22 — two panes from `desk:` up: the fields and the pinned save/delete
    // row on the left, the due-date picker in the handoff's 376px column on the
    // right. The picker is one component mounted twice, each hidden at the other
    // width, driven by the same `dueDate` state — the phone frame puts it
    // between the title and the complexity ramp, the desktop frame puts it in
    // the side column, and no single DOM position is both.
    <div className="flex min-h-0 flex-1 flex-col desk:flex-row desk:gap-7 desk:px-[34px] desk:py-[30px]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <form
          id={formId}
          onSubmit={handleSubmit}
          // `desk:px-1`, not `desk:px-0`: this column scrolls, and a scroll box
          // clips on every axis, so a field flush against its left edge loses
          // the 4px its focus ring needs (`outline` + `outline-offset: 2px`,
          // globals.css). Reported live on the "Add a subtask" field. 4px is
          // invisible against the page's own 34px gutter.
          className="flex flex-1 flex-col overflow-y-auto px-[18px] pt-[18px] pb-2 desk:px-1 desk:pt-0"
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
                // 16px, not the design's 14px — below that, iOS Safari/Chrome
                // zooms the whole page in on focus. Same fix as
                // `CreateTaskSheet`'s title field.
                "mt-[6px] h-[46px] w-full rounded-input border px-[13px] text-[16px] font-bold text-ink outline-none",
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

          <div className="mb-4 desk:hidden">
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

          <div className="mb-4">
            <SubtaskList
              taskId={task.id}
              subtasks={task.subtasks}
              parentCoins={reward.coins}
              titleErrors={subtaskErrors}
              onTitleInput={(subtaskId) =>
                setSubtaskErrors((current) => {
                  if (!current[subtaskId]) return current;
                  const next = { ...current };
                  delete next[subtaskId];
                  return next;
                })
              }
            />
          </div>
        </form>

        <div className="flex-none border-t border-border-track bg-warm px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] desk:mt-auto desk:bg-transparent desk:px-0 desk:pt-[18px] desk:pb-0">
          {/* The frame draws a "Reward on completion · N coins · N XP" line here.
              Dropped on the user's call (2026-07-29) — it looked wrong in place,
              and the figure is already on the task row and under each subtask, so
              nothing is lost by not repeating it a third time. */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete task"
              className="flex h-[46px] w-[48px] flex-none items-center justify-center rounded-input border border-urgency-border bg-surface text-urgency-text transition-colors duration-120 hover:border-urgency-border-hover hover:bg-urgency-tint"
            >
              <Trash2 size={18} strokeWidth={2.2} aria-hidden />
            </button>
            {/* `Button` is stretched by this wrapper rather than by passing it
                `flex-1`: `fullWidth={false}` emits `flex-none`, and `cn` is a
                plain join with no conflict resolution, so the two would race on
                stylesheet order instead of one clearly winning. */}
            <div className="flex-1">
              <Button
                type="submit"
                form={formId}
                size="dialog"
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
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
      </div>

      <aside className="hidden flex-none desk:block desk:w-[376px]">
        <DatePicker value={dueDate} onChange={setDueDate} label="DUE DATE" />
      </aside>

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
    </div>
  );
}

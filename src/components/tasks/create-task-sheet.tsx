"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/tasks/date-picker";
import { TierSelect } from "@/components/tasks/tier-select";
import { cn } from "@/lib/cn";
import type { TaskTier } from "@/lib/task-tiers";

/**
 * TASK-02 — the create-task bottom sheet. `POST`s to TASK-08's
 * `/api/tasks` (wired the same day that ticket shipped).
 *
 * Built on the native `<dialog>` the same way `Modal` (SHR-03) is, for
 * platform focus-trapping and Escape-to-close, but anchored to the bottom of
 * the viewport with only the top corners rounded, matching the mock's sheet
 * rather than a centred dialog.
 *
 * `router.refresh()` on success re-runs the server components on the current
 * route (TASK-01's `tasksForUser()` fetch included), so the new task shows
 * up without a full reload. It's called here rather than via a prop callback
 * because this component is mounted from two different places (`BottomNav`
 * and the empty state) and both want the same effect.
 *
 * Subtasks (SUB-01/02) can be queued here too, added on the user's request
 * (2026-07-30) so a task with known subtasks doesn't need a round trip
 * through the edit screen just to add them. There is no batch-create
 * endpoint — the task doesn't have an id until TASK-08's `POST /api/tasks`
 * returns one — so titles are held as local state and each is sent through
 * SUB-04's existing `/api/tasks/[id]/subtasks` right after, in parallel.
 * `SubtaskList` isn't reused here: every one of its interactions (complete,
 * `router.refresh()` on add) assumes a real, already-saved `taskId`, which
 * this form doesn't have until the moment it submits.
 */
export function CreateTaskSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const titleFieldId = useId();
  const titleErrorId = useId();
  const tierLabelId = useId();
  const tierErrorId = useId();

  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<TaskTier["tier"] | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [titleError, setTitleError] = useState<string>();
  const [tierError, setTierError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const subtaskFieldId = useId();
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  function commitSubtaskDraft() {
    const value = subtaskDraft.trim();
    if (value) setSubtasks((current) => [...current, value]);
    setSubtaskDraft("");
    // Stays open — adding several subtasks in a row is the point, same as
    // SubtaskList's "Add" would otherwise take a fresh click each time.
    subtaskInputRef.current?.focus();
  }

  // Every open starts from a clean form rather than wherever the last one was
  // left. Adjusted during render (React's recommended pattern for "reset
  // state when a prop changes") rather than in an effect, which would fire
  // an extra cascading render for the same result.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setTitle("");
      setTier(null);
      setDueDate(null);
      setTitleError(undefined);
      setTierError(undefined);
      setSubmitError(undefined);
      setSubtasks([]);
      setSubtaskDraft("");
      setAddingSubtask(false);
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const nextTitleError = title.trim() ? undefined : "Give the task a title.";
    const nextTierError = tier ? undefined : "Pick how big this is.";
    setTitleError(nextTitleError);
    setTierError(nextTierError);
    if (nextTitleError || nextTierError) return;

    // A subtask still sitting in the draft field when "Add task" is pressed
    // is queued rather than dropped — typing a title and hitting the form's
    // main submit reads as "done with this one", not "discard it".
    const pendingSubtasks = subtaskDraft.trim()
      ? [...subtasks, subtaskDraft.trim()]
      : subtasks;

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, complexityTier: tier, dueDate }),
      });

      if (!response.ok) {
        setSubmitError("Couldn't add the task. Try again.");
        return;
      }

      const { task } = (await response.json()) as { task: { id: string } };

      if (pendingSubtasks.length > 0) {
        // Best-effort: the task itself is already saved, so a subtask that
        // fails to attach shouldn't block the sheet from closing or read as
        // the whole thing having failed — it can still be added from the
        // edit screen. `Promise.allSettled`, not `Promise.all`, for exactly
        // that reason.
        await Promise.allSettled(
          pendingSubtasks.map((subtaskTitle) =>
            fetch(`/api/tasks/${task.id}/subtasks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: subtaskTitle }),
            }),
          ),
        );
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setSubmitError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onOpenChange(false)}
      // The dialog element fills the viewport under the sheet, so a click that
      // lands on it rather than on the sheet itself is a scrim tap.
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false);
      }}
      aria-labelledby={headingId}
      className={cn(
        "max-h-[85vh] bg-transparent p-0 text-ink backdrop:bg-scrim",
        // A bottom sheet on a phone. `top-auto` is load-bearing: the UA
        // stylesheet gives a modal dialog `inset-block-start: 0`, so setting
        // only `bottom-0` leaves both edges pinned and the sheet renders at the
        // *top* of the viewport instead.
        // `max-w-none` is load-bearing too: the UA gives a dialog
        // `max-width: calc(100% - 6px - 2em)`, which clips a full-bleed sheet
        // ~38px short of the viewport.
        "fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-[26px]",
        // From `frame:` up the app is a 400px card floating on the board, and a
        // sheet welded to the bottom of a wide window reads as belonging to the
        // window rather than to the card. So it becomes a centred dialog there,
        // the same shape `Modal` uses — `inset-0` plus `m-auto` is what centres
        // a `<dialog>`. Unspecified in the handoff (every frame is a phone);
        // this follows `AppShell`'s own rule for the 480px breakpoint.
        "frame:inset-0 frame:m-auto frame:h-fit frame:w-[calc(100%-2.5rem)] frame:max-w-app frame:rounded-[26px]",
      )}
    >
      <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-[26px] bg-surface pb-[env(safe-area-inset-bottom)] shadow-modal frame:rounded-[26px]">
        {/* The grabber is a real control, not decoration: tapping it closes the
            sheet, which is the gesture the shape is already promising. */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="group w-full flex-none py-3"
        >
          <span className="mx-auto block h-[5px] w-10 rounded-[3px] bg-step-idle transition-colors duration-120 group-hover:bg-checkbox" />
        </button>

        {/* pt-1, not pt-4: the grabber above is now a button and carries its own
            bottom padding as tap target, which the bare handle did not. */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 pt-1 pb-5">
          <h2 id={headingId} className="mb-4 font-display text-[20px] font-semibold">
            New task
          </h2>

          <div className="mb-4">
            <label
              htmlFor={titleFieldId}
              className="text-[11px] font-extrabold tracking-[0.4px] text-ink-soft"
            >
              WHAT NEEDS DOING?
            </label>
            <input
              id={titleFieldId}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                // Clear the field's error as soon as the user starts fixing it
                // (same convention as register-form.tsx).
                setTitleError(undefined);
              }}
              placeholder="e.g. Email my supervisor"
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? titleErrorId : undefined}
              className={cn(
                // 16px, not the design's 14px: below 16px, iOS Safari/Chrome
                // zooms the whole page in on focus (no way to opt out short
                // of disabling pinch-zoom entirely, which NFR-GEN-1's
                // accessibility bar rules out) — same fix as every other text
                // input in this pass.
                "mt-[6px] h-[46px] w-full rounded-input border px-[13px] text-[16px] text-ink outline-none",
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
            <div
              id={tierLabelId}
              className="mb-2 text-[11px] font-extrabold tracking-[0.4px] text-ink-soft"
            >
              HOW BIG?
            </div>
            <TierSelect
              value={tier}
              onChange={(next) => {
                setTier(next);
                setTierError(undefined);
              }}
              labelledBy={tierLabelId}
              describedBy={tierError ? tierErrorId : undefined}
            />
            {tierError ? (
              <p id={tierErrorId} role="alert" className="mt-1 text-[11px] font-bold text-urgency-text">
                {tierError}
              </p>
            ) : null}
          </div>

          <div className="mb-4">
            <DatePicker value={dueDate} onChange={setDueDate} label="DUE (OPTIONAL)" />
          </div>

          <div className="mb-[18px]">
            <div className="mb-2 flex items-center justify-between">
              <span
                id={subtaskFieldId}
                className="text-[11px] font-extrabold tracking-[0.4px] text-ink-soft"
              >
                SUBTASKS (OPTIONAL)
              </span>
              {!addingSubtask ? (
                <button
                  type="button"
                  onClick={() => setAddingSubtask(true)}
                  className="text-[12px] font-bold text-terracotta hover:text-terracotta-hover"
                >
                  Add
                </button>
              ) : null}
            </div>

            {subtasks.length > 0 ? (
              <ul className="mb-2 flex flex-col gap-[7px]">
                {subtasks.map((subtaskTitle, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 rounded-input border border-border-track bg-warm px-3 py-2 text-[13px]"
                  >
                    <span className="min-w-0 flex-1 truncate">{subtaskTitle}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSubtasks((current) => current.filter((_, i) => i !== index))
                      }
                      aria-label={`Remove subtask "${subtaskTitle}"`}
                      className="flex-none text-ink-faint hover:text-urgency-text"
                    >
                      <X size={15} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {addingSubtask ? (
              <div className="flex items-center gap-2">
                <input
                  ref={subtaskInputRef}
                  aria-labelledby={subtaskFieldId}
                  autoFocus
                  value={subtaskDraft}
                  onChange={(event) => setSubtaskDraft(event.target.value)}
                  onKeyDown={(event) => {
                    // Not a real form submit — a nested `<form>` inside the
                    // sheet's own `<form>` is invalid HTML, same reasoning
                    // `SubtaskList` documents for the edit screen.
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitSubtaskDraft();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setSubtaskDraft("");
                      setAddingSubtask(false);
                    }
                  }}
                  placeholder="e.g. Draft the outline"
                  className={cn(
                    // 16px — see the title field's comment above.
                    "h-[40px] min-w-0 flex-1 rounded-input border border-border-input bg-input px-3 text-[16px] text-ink outline-none",
                    "transition-[background-color,border-color,box-shadow] duration-120",
                    "focus:border-terracotta focus:bg-surface",
                    "focus:shadow-[0_0_0_1px_var(--color-terracotta),0_0_0_5px_rgb(226_122_84/0.16)]",
                  )}
                />
                <button
                  type="button"
                  onClick={commitSubtaskDraft}
                  disabled={!subtaskDraft.trim()}
                  aria-label="Add subtask"
                  className="flex size-[40px] flex-none items-center justify-center rounded-input bg-terracotta text-white disabled:bg-terracotta-disabled"
                >
                  <Plus size={17} strokeWidth={2.4} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubtaskDraft("");
                    setAddingSubtask(false);
                  }}
                  aria-label="Stop adding subtasks"
                  className="flex-none text-[12px] font-bold text-ink-soft hover:text-ink"
                >
                  Done
                </button>
              </div>
            ) : null}
          </div>

          {/* Stacked, confirm first. Escape and a scrim tap already cancelled;
              this is the visible way to do it, which neither of those is.
              Text-only rather than the outlined `secondary` variant — a second
              bordered button under "Add task" reads as a second choice of equal
              weight, and dismissing isn't one. Same treatment as the level-up
              screen's "Keep going". */}
          <div className="flex flex-col items-center gap-2">
            <Button type="submit" size="full" disabled={submitting}>
              {submitting ? "Adding…" : "Add task"}
            </Button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              className="rounded-chip px-3 py-1 text-[13px] font-bold text-ink-soft transition-colors duration-120 hover:not-disabled:text-ink disabled:text-ink-disabled"
            >
              Cancel
            </button>
          </div>
          {submitError ? (
            <p role="alert" className="mt-2 text-center text-[11px] font-bold text-urgency-text">
              {submitError}
            </p>
          ) : null}
        </form>
      </div>
    </dialog>
  );
}

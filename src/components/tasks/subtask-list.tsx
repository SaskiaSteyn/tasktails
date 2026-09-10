"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/cn";
import { previewShare } from "@/lib/rewards";
import type { Subtask } from "@/generated/prisma/client";

/**
 * SUB-01/02/04 — subtask list on the task edit screen. Matches the
 * "Task detail / edit" frame's SUBTASKS block: `bg-warm` rows,
 * strikethrough title once done, coin share on the right, "Add" above.
 *
 * The list has no fixed height and simply grows with `subtasks.length`,
 * which is what the ticket's "expandable" means here — the mock has no
 * accordion/collapse affordance for this block.
 *
 * "Add" (SUB-02) opens an inline title input, matching the app's input
 * styling, and `POST`s SUB-04's `/api/tasks/[id]/subtasks` for real (wired
 * the same day that ticket shipped — same convention as TASK-02→TASK-08).
 * `router.refresh()` on success re-runs `taskForUser()` on the page, which
 * is how the new row shows up; the input closes rather than staying open,
 * since there's nothing left to fix once the add actually worked.
 *
 * **A subtask cannot be completed here** (user's direction, 2026-09-10).
 * SUB-03/05's checkbox used to live on this row; this screen is for editing
 * a task, and completing one is doing it. The dashboard still does it —
 * `TaskList` renders subtasks through `TaskRow` and posts SUB-05's
 * `/api/tasks/[id]/subtasks/[subId]/complete` there — so the capability is
 * The handoff's circle goes with it rather than staying on as a state dot
 * — a row that cannot be completed has no use for one. A finished subtask
 * still reads as finished from its struck-through title.
 *
 * That is also why this component no longer touches `useLevelUp()` or
 * `useAchievementUnlock()`, and no longer shows a reward pop — a completion
 * was the only thing that could have raised one.
 *
 * The add control is a plain `div`, not a nested `<form>` — this whole list
 * renders inside `EditTaskForm`'s own `<form>` (TASK-03's save/submit), and
 * a `<form>` inside a `<form>` is invalid HTML that made the browser route
 * "Add subtask" submits to the *outer* form instead (silently saving the
 * task and losing the typed subtask title). Enter-to-submit is wired by
 * hand via `onKeyDown` instead of relying on native form submission.
 *
 * A row's title is editable (#273) — SUB-04 could add a subtask and SUB-05
 * complete one, but nothing could fix a typo or drop a row that turned out
 * not to be needed.
 *
 * It saves the way the parent task's title does (user's direction,
 * 2026-09-10) — by "Save changes", not by clicking out of it. This
 * component therefore does not `PATCH` a rename at all: the inputs are
 * `name`d and sit inside `EditTaskForm`'s form, which reads them from
 * `FormData` on submit. Enter and Escape are left to the browser, exactly as
 * on the parent field.
 *
 * The row *is* the field: the input is bare and the row around it carries
 * the border, fill, focus ring and error state, so the highlight lands on
 * the whole row rather than on a box drawn inside one. Delete sits beside
 * it as a 38px square, the same shape and column as the "Add a subtask"
 * control's "+" button, which keeps the row back at the handoff's height.
 * Only the text departs, at 16px rather than 12.5px, because iOS
 * Safari/Chrome zooms the page in on a focused input below 16px.
 *
 * Adding and deleting stay immediate — those are actions, not fields, and
 * neither has a "Save changes" to wait for.
 *
 * Delete is offered only on an *incomplete* row. Removing one that has
 * already banked its share lets its siblings re-split the parent's full
 * reward on a smaller count — see `deleteSubtask()` for the arithmetic. The
 * API enforces it; this only avoids showing a button that would 409.
 *
 * The coin figure per row is a client-side preview of SUB-05's proportional
 * split — the exact `parentCoins / subtasks.length`, to two decimals, so a
 * 15-coin Small task split two ways reads 7.5 rather than the 7 a floor used
 * to show (#236). Not authoritative: the server banks whole coins
 * (`splitShare()` hands out 8 then 7 so the pair still sums to 15), and
 * efficiency/streak/cooldown move the real grant further. The reward pop that
 * briefly replaces it on completion shows the *actual* granted amount from
 * the response instead, same reasoning as `TaskRow`'s.
 */
export function SubtaskList({
  taskId,
  subtasks,
  parentCoins,
  titleErrors,
  onTitleInput,
}: {
  taskId: string;
  subtasks: Subtask[];
  parentCoins: number;
  /** Per-subtask "give it a title" errors, raised by `EditTaskForm`'s submit. */
  titleErrors: Record<string, string>;
  /** Clears this row's error as soon as it is being fixed, same as the parent title field. */
  onTitleInput: (subtaskId: string) => void;
}) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const [rowError, setRowError] = useState<string>();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const shareCoins = previewShare(parentCoins, subtasks.length);

  useEffect(() => {
    if (!rowError) return;
    const timer = setTimeout(() => setRowError(undefined), 4000);
    return () => clearTimeout(timer);
  }, [rowError]);

  function openAdd() {
    setAdding(true);
    setTitle("");
    setTitleError(undefined);
    setSubmitError(undefined);
  }

  async function handleSubmit() {
    const nextTitleError = title.trim() ? undefined : "Give the subtask a title.";
    setTitleError(nextTitleError);
    if (nextTitleError) return;

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        setSubmitError("Couldn't add the subtask. Try again.");
        return;
      }

      setAdding(false);
      router.refresh();
    } catch {
      setSubmitError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(subtaskId: string) {
    setDeletingId(subtaskId);
    setRowError(undefined);
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // 409 carries the reason the row can't go (already complete); anything
        // else is a generic failure the participant can retry.
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setRowError(body?.error ?? "Couldn't delete the subtask. Try again.");
        return;
      }

      router.refresh();
    } catch {
      setRowError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-[10px] flex items-center justify-between">
        <span className="text-[11px] font-extrabold tracking-[0.4px] text-ink-soft">
          SUBTASKS
        </span>
        {adding ? null : (
          <button
            type="button"
            onClick={openAdd}
            className="text-[11px] font-bold text-terracotta hover:text-terracotta-hover"
          >
            Add
          </button>
        )}
      </div>

      {subtasks.length === 0 && !adding ? (
        <p className="mb-[7px] text-[12.5px] text-ink-disabled">No subtasks yet.</p>
      ) : (
        <ul className="flex flex-col gap-[7px]">
          {subtasks.map((subtask) => {
            const done = subtask.completedAt !== null;
            const titleError = titleErrors[subtask.id];
            return (
              // Mirrors the "Add a subtask" control below: a 38px field with
              // a square button beside it, not a button tucked inside the
              // field. Back to the handoff's row height too — what made it
              // 46px was giving the input its own box inside the row, and a
              // field inside a field is exactly what looked wrong.
              <li key={subtask.id} className="flex items-start gap-[7px]">
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      // The row *is* the field now: the input below is bare,
                      // and this is what carries the border, fill and focus
                      // ring, so the highlight lands on the whole row.
                      "flex h-[38px] items-center gap-[10px] rounded-[11px] border px-[11px]",
                      "transition-[background-color,border-color,box-shadow] duration-120",
                      titleError
                        ? "border-urgency bg-surface shadow-[0_0_0_1px_var(--color-urgency),0_0_0_5px_rgb(219_76_63/0.14)]"
                        : cn(
                            "border-border-track bg-warm",
                            "focus-within:border-terracotta focus-within:bg-surface",
                            "focus-within:shadow-[0_0_0_1px_var(--color-terracotta),0_0_0_5px_rgb(226_122_84/0.16)]",
                          ),
                    )}
                  >
                    <input
                      // Read at submit out of `EditTaskForm`'s own <form> via
                      // FormData, which is why this needs a name and no value
                      // state: the parent already owns the save, so mirroring
                      // every keystroke up into it would buy nothing.
                      //
                      // Keyed by title so a title changed on the server (an add
                      // or delete elsewhere in the list refreshes this one) still
                      // reaches an input React would otherwise leave alone.
                      name={`subtask-title-${subtask.id}`}
                      key={subtask.title}
                      defaultValue={subtask.title}
                      onChange={() => onTitleInput(subtask.id)}
                      // The strikethrough is CSS, so with the state circle gone
                      // this label is the only thing left telling a screen reader
                      // the row is finished.
                      aria-label={
                        done
                          ? `Subtask name: ${subtask.title} (done)`
                          : `Subtask name: ${subtask.title}`
                      }
                      aria-invalid={titleError ? true : undefined}
                      aria-describedby={titleError ? `${errorId}-${subtask.id}` : undefined}
                      className={cn(
                        // Bare — no border, fill or ring of its own; the row
                        // around it owns all three. 16px, not the handoff's
                        // 12.5px, for the same reason every other input here
                        // is 16px: below that iOS Safari/Chrome zooms the page
                        // in on focus. The row still measures 38px because its
                        // height never came from the text.
                        "min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-ink outline-none",
                        done && !titleError && "text-ink-disabled line-through",
                      )}
                    />

                    <span className="flex-none text-[11px] font-extrabold text-amber-text">
                      {shareCoins}
                    </span>
                  </div>

                  {titleError ? (
                    <p
                      id={`${errorId}-${subtask.id}`}
                      role="alert"
                      className="mt-1 text-[11px] font-bold text-urgency-text"
                    >
                      {titleError}
                    </p>
                  ) : null}
                </div>

                {done ? (
                  // Holds the column so every row's field ends on the same
                  // edge — a finished subtask has no delete (see below).
                  <span className="size-[38px] flex-none" aria-hidden />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDelete(subtask.id)}
                    disabled={deletingId === subtask.id}
                    aria-label={`Delete "${subtask.title}"`}
                    className="flex size-[38px] flex-none items-center justify-center rounded-input border border-border-input bg-surface text-urgency-text transition-colors duration-120 hover:bg-warm disabled:opacity-60"
                  >
                    <Trash2 size={16} strokeWidth={2.2} aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {rowError ? (
        <p role="alert" className="mt-[7px] text-[11px] font-bold text-urgency-text">
          {rowError}
        </p>
      ) : null}

      {adding ? (
        <div className="mt-[7px] flex items-start gap-[7px]">
          <div className="flex-1">
            <input
              id={inputId}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleError(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Add a subtask"
              autoFocus
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? errorId : undefined}
              className={cn(
                // 16px, not the design's 12.5px — below that, iOS
                // Safari/Chrome zooms the whole page in on focus.
                "h-[38px] w-full rounded-input border px-[11px] text-[16px] font-semibold text-ink outline-none",
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
              <p id={errorId} role="alert" className="mt-1 text-[11px] font-bold text-urgency-text">
                {titleError}
              </p>
            ) : null}
            {submitError ? (
              <p role="alert" className="mt-1 text-[11px] font-bold text-urgency-text">
                {submitError}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            aria-label="Add subtask"
            className="flex size-[38px] flex-none items-center justify-center rounded-input bg-terracotta text-surface transition-colors duration-120 hover:bg-terracotta-hover disabled:opacity-60"
          >
            <Plus size={18} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}

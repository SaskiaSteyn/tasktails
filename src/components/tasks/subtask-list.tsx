"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { cn } from "@/lib/cn";
import type { Subtask } from "@/generated/prisma/client";

/**
 * SUB-01/02/04 — subtask list on the task edit screen. Matches the "Task
 * detail / edit" frame's SUBTASKS block: `bg-warm` rows, 18px completion
 * circle, strikethrough title once done, coin share on the right, "+ Add"
 * above.
 *
 * The list has no fixed height and simply grows with `subtasks.length`,
 * which is what the ticket's "expandable" means here — the mock has no
 * accordion/collapse affordance for this block.
 *
 * "+ Add" (SUB-02) opens an inline title input, matching the app's input
 * styling, and `POST`s SUB-04's `/api/tasks/[id]/subtasks` for real (wired
 * the same day that ticket shipped — same convention as TASK-02→TASK-08).
 * `router.refresh()` on success re-runs `taskForUser()` on the page, which
 * is how the new row shows up; the input closes rather than staying open,
 * since there's nothing left to fix once the add actually worked.
 *
 * Each incomplete row's checkbox (SUB-03) is a real, forward-only button —
 * same "no un-complete" rule TASK-05/11 uses, so a done row's checkbox is
 * disabled rather than toggling back. **No
 * `POST /api/tasks/[id]/subtasks/[subId]/complete` yet** — SUB-05 is a
 * separate, unbuilt ticket, so a click doesn't attempt a fetch at all (same
 * "don't call an endpoint that doesn't exist" decision TASK-02 made ahead of
 * TASK-08); it just surfaces the "not connected yet (SUB-05)" notice below
 * the list.
 *
 * The add control is a plain `div`, not a nested `<form>` — this whole list
 * renders inside `EditTaskForm`'s own `<form>` (TASK-03's save/submit), and
 * a `<form>` inside a `<form>` is invalid HTML that made the browser route
 * "Add subtask" submits to the *outer* form instead (silently saving the
 * task and losing the typed subtask title). Enter-to-submit is wired by
 * hand via `onKeyDown` instead of relying on native form submission.
 *
 * The coin figure per existing row is a preview of SUB-03/05's proportional
 * split (`parentCoins / subtasks.length`, floored) — not authoritative;
 * SUB-05's actual grant is server-side.
 */
export function SubtaskList({
  taskId,
  subtasks,
  parentCoins,
}: {
  taskId: string;
  subtasks: Subtask[];
  parentCoins: number;
}) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [completeNotice, setCompleteNotice] = useState<string>();

  const shareCoins =
    subtasks.length > 0 ? Math.floor(parentCoins / subtasks.length) : 0;

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

  function handleComplete() {
    // SUB-05's `POST .../subtasks/[subId]/complete` doesn't exist yet —
    // same "don't call it" decision as `handleSubmit()` above.
    setCompleteNotice("Not connected yet — completing a subtask needs SUB-05.");
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
            + Add
          </button>
        )}
      </div>

      {subtasks.length === 0 && !adding ? (
        <p className="mb-[7px] text-[12.5px] text-ink-disabled">No subtasks yet.</p>
      ) : (
        <ul className="flex flex-col gap-[7px]">
          {subtasks.map((subtask) => {
            const done = subtask.completedAt !== null;
            return (
              <li
                key={subtask.id}
                className="flex items-center gap-[10px] rounded-[11px] border border-border-track bg-warm px-[11px] py-[9px]"
              >
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={done}
                  aria-pressed={done}
                  aria-label={
                    done ? `"${subtask.title}" is done` : `Mark "${subtask.title}" as done`
                  }
                  className={cn(
                    "flex size-[18px] flex-none items-center justify-center rounded-full transition-colors duration-120",
                    done
                      ? "bg-sage"
                      : "border-2 border-checkbox hover:border-ink-disabled",
                  )}
                >
                  {done ? (
                    <Check size={11} strokeWidth={3} className="text-surface" />
                  ) : null}
                </button>
                <span
                  className={cn(
                    "flex-1 text-[12.5px] font-semibold",
                    done && "text-ink-disabled line-through",
                  )}
                >
                  {subtask.title}
                </span>
                <span className="text-[11px] font-extrabold text-amber-text">
                  {shareCoins}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {completeNotice ? (
        <p role="status" className="mt-[7px] text-[11px] font-bold text-ink-soft">
          {completeNotice}
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
                "h-[38px] w-full rounded-input border px-[11px] text-[12.5px] font-semibold text-ink outline-none",
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

"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { useLevelUp } from "@/components/economy/level-up-provider";
import { cn } from "@/lib/cn";
import type { Subtask } from "@/generated/prisma/client";

/** The pieces of SUB-05's response this component actually reads. */
type CompleteResponse = {
  reward: { granted: { coins: number; xp: number } } | null;
  levelUp: Parameters<ReturnType<typeof useLevelUp>["celebrate"]>[0];
  error?: string;
};

/**
 * SUB-01/02/03/04/05 — subtask list on the task edit screen. Matches the
 * "Task detail / edit" frame's SUBTASKS block: `bg-warm` rows, 18px
 * completion circle, strikethrough title once done, coin share on the
 * right, "+ Add" above.
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
 * Each incomplete row's checkbox (SUB-03) `POST`s SUB-05's
 * `/api/tasks/[id]/subtasks/[subId]/complete` for real, same "wired the
 * same day" convention. **Forward-only**, same rule as TASK-05/11 — a done
 * row's checkbox is disabled rather than toggling back. `router.refresh()`
 * on success updates the row's own `completedAt`/strikethrough *and* the
 * header's coins/XP/streak from the server (SUB-05's response may also
 * auto-complete the parent task, SUB-4, which the refreshed page reflects
 * too). A level-up crossing goes straight to ECO-07's
 * `useLevelUp().celebrate()`, same as TASK-05.
 *
 * The add control is a plain `div`, not a nested `<form>` — this whole list
 * renders inside `EditTaskForm`'s own `<form>` (TASK-03's save/submit), and
 * a `<form>` inside a `<form>` is invalid HTML that made the browser route
 * "Add subtask" submits to the *outer* form instead (silently saving the
 * task and losing the typed subtask title). Enter-to-submit is wired by
 * hand via `onKeyDown` instead of relying on native form submission.
 *
 * The coin figure per row is a client-side preview of SUB-05's proportional
 * split (`parentCoins / subtasks.length`, floored) — not authoritative,
 * since efficiency/streak/cap can move the real grant. The reward pop that
 * briefly replaces it on completion shows the *actual* granted amount from
 * the response instead, same reasoning as `TaskRow`'s.
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
  const { celebrate } = useLevelUp();
  const inputId = useId();
  const errorId = useId();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    subtaskId: string;
    coins: number;
    xp: number;
  } | null>(null);
  const [completeError, setCompleteError] = useState<string>();

  const shareCoins =
    subtasks.length > 0 ? Math.floor(parentCoins / subtasks.length) : 0;

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 900);
    return () => clearTimeout(timer);
  }, [celebration]);

  useEffect(() => {
    if (!completeError) return;
    const timer = setTimeout(() => setCompleteError(undefined), 4000);
    return () => clearTimeout(timer);
  }, [completeError]);

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

  async function handleComplete(subtaskId: string) {
    setCompletingId(subtaskId);
    setCompleteError(undefined);
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/subtasks/${subtaskId}/complete`,
        { method: "POST" },
      );
      const body = (await response.json()) as CompleteResponse;

      if (!response.ok) {
        setCompleteError(body.error ?? "Couldn't complete the subtask. Try again.");
        return;
      }

      if (body.reward) {
        setCelebration({
          subtaskId,
          coins: body.reward.granted.coins,
          xp: body.reward.granted.xp,
        });
      }
      celebrate(body.levelUp);
      router.refresh();
    } catch {
      setCompleteError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setCompletingId(null);
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
            const pending = completingId === subtask.id;
            const reward =
              celebration?.subtaskId === subtask.id
                ? { coins: celebration.coins, xp: celebration.xp }
                : null;
            return (
              <li
                key={subtask.id}
                className="flex items-center gap-[10px] rounded-[11px] border border-border-track bg-warm px-[11px] py-[9px]"
              >
                <span className="relative flex-none">
                  <button
                    type="button"
                    onClick={() => handleComplete(subtask.id)}
                    disabled={done || pending}
                    aria-pressed={done}
                    aria-label={
                      done ? `"${subtask.title}" is done` : `Mark "${subtask.title}" as done`
                    }
                    className={cn(
                      "flex size-[18px] items-center justify-center rounded-full transition-colors duration-120",
                      done
                        ? "bg-sage"
                        : "border-2 border-checkbox hover:border-ink-disabled",
                      pending && "opacity-60",
                    )}
                  >
                    {done ? (
                      <Check size={11} strokeWidth={3} className="text-surface" />
                    ) : null}
                  </button>
                </span>
                <span
                  className={cn(
                    "flex-1 text-[12.5px] font-semibold",
                    done && "text-ink-disabled line-through",
                  )}
                >
                  {subtask.title}
                </span>
                {reward ? (
                  <span className="text-[11px] font-extrabold whitespace-nowrap text-sage-text">
                    +{reward.coins} · +{reward.xp} XP
                  </span>
                ) : (
                  <span className="text-[11px] font-extrabold text-amber-text">
                    {shareCoins}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {completeError ? (
        <p role="alert" className="mt-[7px] text-[11px] font-bold text-urgency-text">
          {completeError}
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

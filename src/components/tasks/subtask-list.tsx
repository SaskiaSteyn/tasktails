"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { useAchievementUnlock } from "@/components/economy/achievement-unlock-provider";
import { useLevelUp } from "@/components/economy/level-up-provider";
import { cn } from "@/lib/cn";
import { previewShare } from "@/lib/rewards";
import type { Subtask } from "@/generated/prisma/client";

/** The pieces of SUB-05's response this component actually reads. */
type CompleteResponse = {
  reward: { granted: { coins: number; xp: number } } | null;
  levelUp: Parameters<ReturnType<typeof useLevelUp>["celebrate"]>[0];
  achievementsUnlocked: Parameters<
    ReturnType<typeof useAchievementUnlock>["celebrate"]
  >[0];
  error?: string;
};

/**
 * SUB-01/02/03/04/05 — subtask list on the task edit screen. Matches the
 * "Task detail / edit" frame's SUBTASKS block: `bg-warm` rows, 18px
 * completion circle, strikethrough title once done, coin share on the
 * right, "Add" above.
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
 * Each incomplete row's checkbox (SUB-03) `POST`s SUB-05's
 * `/api/tasks/[id]/subtasks/[subId]/complete` for real, same "wired the
 * same day" convention. **Forward-only**, same rule as TASK-05/11 — a done
 * row's checkbox is disabled rather than toggling back. `router.refresh()`
 * on success updates the row's own `completedAt`/strikethrough *and* the
 * header's coins/XP/streak from the server. Ticking the last row leaves the
 * parent task open (#253) — closing it is the participant's own tap, on the
 * task itself. A level-up crossing goes straight to ECO-07's
 * `useLevelUp().celebrate()`, same as TASK-05.
 *
 * The add control is a plain `div`, not a nested `<form>` — this whole list
 * renders inside `EditTaskForm`'s own `<form>` (TASK-03's save/submit), and
 * a `<form>` inside a `<form>` is invalid HTML that made the browser route
 * "Add subtask" submits to the *outer* form instead (silently saving the
 * task and losing the typed subtask title). Enter-to-submit is wired by
 * hand via `onKeyDown` instead of relying on native form submission.
 *
 * A row's title is editable in place (#273) — SUB-04 could add a subtask
 * and SUB-05 complete one, but nothing could fix a typo or drop a row that
 * turned out not to be needed. It behaves like the parent task's own title
 * field: click in, type, click away and it keeps what was typed. No confirm
 * or cancel button (user's direction, 2026-09-10), so the row gains only a
 * delete icon over what the handoff draws.
 *
 * The one visual departure is the font size. The handoff sets a row at
 * 12.5px, which is where it stays at rest, but a focused input below 16px
 * makes iOS Safari/Chrome zoom the whole page in — the reason every other
 * input in this app is 16px — so it steps up while focused and back on blur.
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
}: {
  taskId: string;
  subtasks: Subtask[];
  parentCoins: number;
}) {
  const router = useRouter();
  const { celebrate } = useLevelUp();
  const { celebrate: celebrateAchievements } = useAchievementUnlock();
  const inputId = useId();
  const errorId = useId();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string>();

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    subtaskId: string;
    coins: number;
    xp: number;
  } | null>(null);
  const [completeError, setCompleteError] = useState<string>();

  const shareCoins = previewShare(parentCoins, subtasks.length);

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

  /**
   * Saves on blur, the way the parent task's own title field behaves — no
   * confirm button to hunt for, and clicking away keeps what was typed
   * (user's direction, 2026-09-10).
   *
   * The input is uncontrolled, so there is no per-row draft state to keep in
   * step with `subtasks`: the DOM already holds what was typed, and after
   * `router.refresh()` the props catch up to it. That is also why a rejected
   * value is put back by writing to the element directly — an empty title is
   * the one thing the row cannot keep, and reverting is friendlier than an
   * error on a field the participant has already clicked away from.
   */
  async function handleRename(subtask: Subtask, input: HTMLInputElement) {
    const title = input.value.trim();
    setEditingId(null);

    if (!title) {
      input.value = subtask.title;
      return;
    }
    if (title === subtask.title) return;

    setRowError(undefined);
    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        input.value = subtask.title;
        setRowError("Couldn't rename the subtask. Try again.");
        return;
      }

      router.refresh();
    } catch {
      input.value = subtask.title;
      setRowError("Couldn't reach TaskTails. Check your connection and try again.");
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
      celebrateAchievements(body.achievementsUnlocked);
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
            const pending = completingId === subtask.id;
            const reward =
              celebration?.subtaskId === subtask.id
                ? { coins: celebration.coins, xp: celebration.xp }
                : null;
            const editing = editingId === subtask.id;

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

                <input
                  // Uncontrolled, keyed by title: React leaves an uncontrolled
                  // input's value alone on re-render, which is what lets the
                  // typed text survive until `router.refresh()` lands — but it
                  // would also ignore a title changed anywhere else, so the key
                  // remounts the row when the server sends a different one.
                  key={subtask.title}
                  defaultValue={subtask.title}
                  onFocus={() => setEditingId(subtask.id)}
                  onBlur={(event) => handleRename(subtask, event.currentTarget)}
                  onKeyDown={(event) => {
                    // Enter commits by blurring rather than submitting: this
                    // list renders inside `EditTaskForm`'s own <form>, so a
                    // real submit would save the whole task instead.
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      event.currentTarget.value = subtask.title;
                      event.currentTarget.blur();
                    }
                  }}
                  aria-label={`Subtask name: ${subtask.title}`}
                  className={cn(
                    "min-w-0 flex-1 truncate rounded-[7px] border border-transparent bg-transparent font-semibold text-ink outline-none",
                    "transition-[background-color,border-color,font-size] duration-120",
                    // 12.5px at rest to match the handoff's row, 16px while
                    // focused: below 16px iOS Safari/Chrome zooms the page in
                    // on focus, the same reason every other input in this app
                    // sits at 16px.
                    editing
                      ? "-mx-[5px] border-terracotta bg-surface px-[5px] py-[1px] text-[16px]"
                      : "text-[12.5px]",
                    done && !editing && "text-ink-disabled line-through",
                  )}
                />

                {done ? null : (
                  <button
                    type="button"
                    onClick={() => handleDelete(subtask.id)}
                    disabled={deletingId === subtask.id}
                    aria-label={`Delete "${subtask.title}"`}
                    className="flex-none text-ink-faint transition-colors duration-120 hover:text-urgency-text disabled:opacity-60"
                  >
                    <Trash2 size={13} strokeWidth={2.2} aria-hidden />
                  </button>
                )}

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

      {(completeError ?? rowError) ? (
        <p role="alert" className="mt-[7px] text-[11px] font-bold text-urgency-text">
          {completeError ?? rowError}
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

"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/tasks/date-picker";
import { TierSelect } from "@/components/tasks/tier-select";
import { cn } from "@/lib/cn";
import type { TaskTier } from "@/lib/task-tiers";

/**
 * TASK-02 — the create-task bottom sheet.
 *
 * Built on the native `<dialog>` the same way `Modal` (SHR-03) is, for
 * platform focus-trapping and Escape-to-close, but anchored to the bottom of
 * the viewport with only the top corners rounded, matching the mock's sheet
 * rather than a centred dialog.
 *
 * There is no `POST /api/tasks` yet — TASK-08 is a separate, unbuilt ticket.
 * Submitting a fully valid form does *not* pretend to succeed: it stops on a
 * visible notice instead, so the required-field validation is genuinely
 * exercised without silently discarding what looks like a real task.
 */
export function CreateTaskSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
  const [stubbedNotice, setStubbedNotice] = useState(false);

  // Every open starts from a clean form rather than wherever the last one was
  // left, including the stubbed-submit notice. Adjusted during render (React's
  // recommended pattern for "reset state when a prop changes") rather than in
  // an effect, which would fire an extra cascading render for the same result.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setTitle("");
      setTier(null);
      setDueDate(null);
      setTitleError(undefined);
      setTierError(undefined);
      setStubbedNotice(false);
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const nextTitleError = title.trim() ? undefined : "Give the task a title.";
    const nextTierError = tier ? undefined : "Pick how big this is.";
    setTitleError(nextTitleError);
    setTierError(nextTierError);
    if (nextTitleError || nextTierError) return;

    setStubbedNotice(true);
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
      className="fixed inset-x-0 bottom-0 m-0 max-h-[85vh] w-full max-w-app bg-transparent p-0 text-ink backdrop:bg-scrim"
    >
      <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-[26px] bg-surface pb-[env(safe-area-inset-bottom)] shadow-modal">
        <div aria-hidden className="flex-none pt-3">
          <div className="mx-auto h-[5px] w-10 rounded-[3px] bg-step-idle" />
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 pt-4 pb-5">
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
                "mt-[6px] h-[46px] w-full rounded-input border px-[13px] text-[14px] text-ink outline-none",
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

          <div className="mb-[18px]">
            <DatePicker value={dueDate} onChange={setDueDate} label="DUE (OPTIONAL)" />
          </div>

          <Button type="submit" size="full">
            Add task
          </Button>
          {stubbedNotice ? (
            <p className="mt-2 text-center text-[11px] text-ink-soft">
              Looks good — but creating tasks isn&apos;t connected yet
              (TASK-08). Nothing was saved.
            </p>
          ) : null}
        </form>
      </div>
    </dialog>
  );
}

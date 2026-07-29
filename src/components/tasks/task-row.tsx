"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";
import { taskTier, type TaskTier } from "@/lib/task-tiers";

/**
 * Task row (TASK-01, TASK-05) — `#FBF6EF` card, 22px completion circle,
 * title + tier badge + due date, coin preview on the right. Matches the
 * Dashboard frame's task row (`design_handoff/TaskTails Screens.dc.html`).
 *
 * Two separate tap targets rather than the mock's whole-row toggle: the
 * checkbox completes in place, and the rest of the row (title through the
 * coin figure) links to the edit screen (TASK-03). The mock only has one
 * interaction to place, tap-anywhere-to-complete; this row has two real
 * ones now, and giving each its own target beats one stealing the other's.
 *
 * The checkbox completes for real via TASK-11 and is **forward-only** —
 * once `done`, it's disabled rather than toggling back (see TASK-11's own
 * file for why there's no un-complete). `TaskList` owns the fetch, the
 * pending/celebration state, and the actual granted reward; this component
 * is purely presentational about completion, same as it always was about
 * everything else.
 */

/** `--color-tier-*` tokens, at the README's "13% alpha bg" for the badge fill. */
const TIER_CLASSES: Record<TaskTier["color"], string> = {
  trivial: "bg-tier-trivial/13 text-tier-trivial",
  small: "bg-tier-small/13 text-tier-small",
  medium: "bg-tier-medium/13 text-tier-medium",
  large: "bg-tier-large/13 text-tier-large",
  epic: "bg-tier-epic/13 text-tier-epic",
};

const DUE_DATE_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  month: "short",
  day: "numeric",
});

export function TaskRow({
  id,
  title,
  dueDate,
  complexityTier,
  done,
  pending,
  celebrationReward,
  onComplete,
}: {
  id: string;
  title: string;
  dueDate: Date | null;
  complexityTier: number;
  done: boolean;
  /** This row's completion request is in flight — disables the checkbox. */
  pending: boolean;
  /** The real granted amount from TASK-11's response, while the pop plays. */
  celebrationReward: { coins: number; xp: number } | null;
  onComplete: () => void;
}) {
  const tier = taskTier(complexityTier);

  return (
    <li className="flex items-center gap-[11px] rounded-card border border-border-track bg-warm px-[12px] py-[11px]">
      <span className="relative flex-none">
        <button
          type="button"
          onClick={onComplete}
          disabled={done || pending}
          aria-pressed={done}
          aria-label={done ? `"${title}" is done` : `Mark "${title}" as done`}
          className={cn(
            "flex size-[22px] items-center justify-center rounded-full transition-transform duration-300 ease-out",
            done ? "bg-sage" : "border-2 border-checkbox hover:border-ink-disabled",
            pending && "opacity-60",
            celebrationReward && "scale-125",
          )}
        >
          {done ? (
            <Check size={13} strokeWidth={3} className="text-surface" aria-hidden />
          ) : null}
        </button>

        {celebrationReward ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 [animation:task-reward-float_900ms_ease-out_forwards] text-[11px] font-extrabold whitespace-nowrap text-sage-text"
          >
            +{celebrationReward.coins} · +{celebrationReward.xp} XP
          </span>
        ) : null}
      </span>

      <Link
        href={`/tasks/${id}`}
        className="flex min-w-0 flex-1 items-center gap-[11px] rounded-[8px] transition-colors duration-120 hover:bg-input"
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[13.5px] font-bold",
              done && "text-ink-disabled line-through",
            )}
          >
            {title}
          </span>
          <span className="mt-1 flex items-center gap-[7px]">
            <span
              className={cn(
                "rounded-[6px] px-[7px] py-[2px] text-[10px] font-extrabold",
                TIER_CLASSES[tier.color],
              )}
            >
              {tier.label}
            </span>
            {dueDate ? (
              <span className="text-[11px] text-ink-disabled">
                {DUE_DATE_FORMAT.format(dueDate)}
              </span>
            ) : null}
          </span>
        </span>

        <span className="flex flex-none items-center gap-[3px]">
          <Coin size={13} />
          <span className="text-[12px] font-extrabold text-amber-text">
            {tier.coins}
          </span>
        </span>
      </Link>
    </li>
  );
}

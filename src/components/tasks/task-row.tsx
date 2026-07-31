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
 * coin figure) links to `href`. The mock only has one interaction to place,
 * tap-anywhere-to-complete; this row has two real ones now, and giving each
 * its own target beats one stealing the other's.
 *
 * The checkbox completes for real via TASK-11 (or, for a subtask row,
 * SUB-05) and is **forward-only** — once `done`, it's disabled rather than
 * toggling back (see TASK-11's own file for why there's no un-complete).
 * `TaskList` owns the fetch, the pending/celebration state, and the actual
 * granted reward; this component is purely presentational about completion,
 * same as it always was about everything else.
 *
 * **Reused for subtasks (2026-07-30)**, indented under their parent, at the
 * user's request — a subtask previously had no way to complete from the
 * dashboard, only from the edit screen's separate `SubtaskList`. `dueDate`
 * and `complexityTier` are optional because a `Subtask` has neither; when
 * `complexityTier` is omitted the tier badge doesn't render. `coins` is a
 * required prop rather than derived from `complexityTier` internally, since a
 * subtask's coin figure is its proportional *share* of the parent's reward
 * (`Math.floor(parentCoins / subtasks.length)`, `SubtaskList`'s existing
 * math), not a tier lookup of its own. `href` is likewise explicit rather
 * than assumed to be `/tasks/${id}` — a subtask has no edit screen of its
 * own, so its row links to its *parent's* id instead.
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
  title,
  href,
  dueDate = null,
  complexityTier,
  coins,
  done,
  pending,
  celebrationReward,
  onComplete,
  indent = false,
}: {
  title: string;
  /** Where the row (everything but the checkbox) links to. */
  href: string;
  dueDate?: Date | null;
  /** Omitted for a subtask row — `Subtask` has no tier of its own. */
  complexityTier?: number;
  /** The coin figure shown on the right, static until `celebrationReward`. */
  coins: number;
  done: boolean;
  /** This row's completion request is in flight — disables the checkbox. */
  pending: boolean;
  /** The real granted amount from the complete response, while the pop plays. */
  celebrationReward: { coins: number; xp: number } | null;
  onComplete: () => void;
  /** A subtask row, nested under its parent — smaller checkbox, inset, `bg-surface`. */
  indent?: boolean;
}) {
  const tier = complexityTier != null ? taskTier(complexityTier) : null;

  return (
    // A `<div>`, not a `<li>`: this renders for both a top-level task and a
    // nested subtask, and only the caller (`TaskList`) knows which list
    // structure it belongs in — nesting an `<li>` inside another `<li>`
    // without an intervening `<ul>` is invalid HTML.
    <div
      className={cn(
        "flex items-center gap-[11px] rounded-card border border-border-track px-[12px] py-[11px]",
        // A subtask sits on white rather than the parent's warm fill, so the
        // nesting reads as "inside" the row above it rather than as a sibling.
        indent ? "ml-8 bg-surface" : "bg-warm",
      )}
    >
      <span className="relative flex-none">
        <button
          type="button"
          onClick={onComplete}
          disabled={done || pending}
          aria-pressed={done}
          aria-label={done ? `"${title}" is done` : `Mark "${title}" as done`}
          className={cn(
            "flex items-center justify-center rounded-full transition-transform duration-300 ease-out",
            indent ? "size-[18px]" : "size-[22px]",
            done ? "bg-sage" : "border-2 border-checkbox hover:border-ink-disabled",
            pending && "opacity-60",
            celebrationReward && "scale-125",
          )}
        >
          {done ? (
            <Check
              size={indent ? 11 : 13}
              strokeWidth={3}
              className="text-surface"
              aria-hidden
            />
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
        href={href}
        className="flex min-w-0 flex-1 items-center gap-[11px] rounded-[8px] text-ink transition-colors duration-120 hover:bg-input"
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-bold",
              indent ? "text-[13px]" : "text-[13.5px]",
              done && "text-ink-disabled line-through",
            )}
          >
            {title}
          </span>
          {tier || dueDate ? (
            <span className="mt-1 flex items-center gap-[7px]">
              {tier ? (
                <span
                  className={cn(
                    "rounded-[6px] px-[7px] py-[2px] text-[10px] font-extrabold",
                    TIER_CLASSES[tier.color],
                  )}
                >
                  {tier.label}
                </span>
              ) : null}
              {dueDate ? (
                <span className="text-[11px] text-ink-disabled">
                  {DUE_DATE_FORMAT.format(dueDate)}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>

        <span className="flex flex-none items-center gap-[3px]">
          <Coin size={indent ? 12 : 13} />
          <span className="text-[12px] font-extrabold text-amber-text">
            {coins}
          </span>
        </span>
      </Link>
    </div>
  );
}

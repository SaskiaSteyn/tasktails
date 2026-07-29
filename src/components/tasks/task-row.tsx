"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";
import { taskTier, type TaskTier } from "@/lib/task-tiers";

/**
 * Task row (TASK-01, TASK-05) — `#FBF6EF` card, 22px completion circle,
 * title + tier badge + due date, coin preview on the right. Matches the
 * Dashboard frame's task row (`design_handoff/TaskTails Screens.dc.html`).
 *
 * Two separate tap targets rather than the mock's whole-row toggle: the
 * checkbox completes/uncompletes in place, and the rest of the row (title
 * through the coin figure) links to the edit screen (TASK-03). The mock
 * only has one interaction to place, tap-anywhere-to-complete; this row has
 * two real ones now, and giving each its own target beats one stealing the
 * other's.
 *
 * TASK-11 (`POST /api/tasks/[id]/complete`) doesn't exist, and neither does
 * the ECO-01..05 chain it would call — so the checkbox toggles and plays the
 * reward animation for real, but nothing is persisted. `onToggle` mutates
 * local state one level up (`TaskList`), which also owns the one honest
 * "not saved" notice for the whole list rather than one per row.
 *
 * The coin/XP value shown, here and in the reward pop, is the tier's *base*
 * reward (economy_system.md) — the real payout depends on ECO-01's
 * efficiency/streak modifiers, which don't run without TASK-11.
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
  onToggle,
}: {
  id: string;
  title: string;
  dueDate: Date | null;
  complexityTier: number;
  done: boolean;
  onToggle: () => void;
}) {
  const tier = taskTier(complexityTier);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(false), 900);
    return () => clearTimeout(timer);
  }, [celebrate]);

  function handleToggle() {
    if (!done) setCelebrate(true);
    onToggle();
  }

  return (
    <li className="flex items-center gap-[11px] rounded-card border border-border-track bg-warm px-[12px] py-[11px]">
      <span className="relative flex-none">
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={done}
          aria-label={done ? `Mark "${title}" as not done` : `Mark "${title}" as done`}
          className={cn(
            "flex size-[22px] items-center justify-center rounded-full transition-transform duration-300 ease-out",
            done ? "bg-sage" : "border-2 border-checkbox hover:border-ink-disabled",
            celebrate && "scale-125",
          )}
        >
          {done ? (
            <Check size={13} strokeWidth={3} className="text-surface" aria-hidden />
          ) : null}
        </button>

        {celebrate ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 [animation:task-reward-float_900ms_ease-out_forwards] text-[11px] font-extrabold whitespace-nowrap text-sage-text"
          >
            +{tier.coins} · +{tier.xp} XP
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

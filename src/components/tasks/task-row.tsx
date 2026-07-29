import { Check } from "lucide-react";
import Link from "next/link";

import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";
import { taskTier, type TaskTier } from "@/lib/task-tiers";

/**
 * Task row (TASK-01) — `#FBF6EF` card, 22px completion circle, title + tier
 * badge + due date, coin preview on the right. Matches the Dashboard frame's
 * task row exactly (`design_handoff/TaskTails Screens.dc.html`).
 *
 * The whole row links to the edit screen (TASK-03) rather than the mock's
 * tap-to-complete — toggling completion in place is TASK-05, wired to
 * TASK-11's reward calculation, and doesn't exist yet. A row that looked
 * interactive but did nothing would be worse than one that plainly links
 * somewhere real.
 *
 * The coin value shown is the tier's *base* reward (economy_system.md), not
 * a stored per-task amount — the schema has nowhere to persist one, and the
 * real payout depends on ECO-01's efficiency/streak modifiers at completion
 * time. This is the same preview figure the Create-task sheet shows.
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
}: {
  id: string;
  title: string;
  dueDate: Date | null;
  complexityTier: number;
  done: boolean;
}) {
  const tier = taskTier(complexityTier);

  return (
    <li>
      <Link
        href={`/tasks/${id}`}
        className="flex items-center gap-[11px] rounded-card border border-border-track bg-warm px-[12px] py-[11px] transition-colors duration-120 hover:bg-input"
      >
        <span
          aria-hidden
          className={cn(
            "flex size-[22px] flex-none items-center justify-center rounded-full",
            done ? "bg-sage" : "border-2 border-checkbox",
          )}
        >
          {done ? <Check size={13} strokeWidth={3} className="text-surface" /> : null}
        </span>

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

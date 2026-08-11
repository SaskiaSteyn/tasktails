"use client";

import { cn } from "@/lib/cn";
import { TASK_TIERS, type TaskTier } from "@/lib/task-tiers";

/**
 * The 5-chip complexity selector from the Create-task sheet (TASK-02),
 * built for reuse by TASK-03's edit screen too. Unselected: input fill,
 * tier-coloured label, amber coin value. Selected: solid tier-colour fill,
 * white throughout.
 */

const SHORT_LABELS: Record<TaskTier["color"], string> = {
  trivial: "Triv",
  small: "Small",
  medium: "Med",
  large: "Lrg",
  epic: "Epic",
};

const TIER_TEXT_CLASSES: Record<TaskTier["color"], string> = {
  trivial: "text-tier-trivial",
  small: "text-tier-small",
  medium: "text-tier-medium",
  large: "text-tier-large",
  epic: "text-tier-epic",
};

const TIER_SELECTED_CLASSES: Record<TaskTier["color"], string> = {
  trivial: "border-tier-trivial bg-tier-trivial",
  small: "border-tier-small bg-tier-small",
  medium: "border-tier-medium bg-tier-medium",
  large: "border-tier-large bg-tier-large",
  epic: "border-tier-epic bg-tier-epic",
};

export function TierSelect({
  value,
  onChange,
  labelledBy,
  describedBy,
}: {
  value: TaskTier["tier"] | null;
  onChange: (tier: TaskTier["tier"]) => void;
  labelledBy?: string;
  describedBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="flex gap-[6px]"
    >
      {TASK_TIERS.map((tier) => {
        const selected = value === tier.tier;

        return (
          <button
            key={tier.tier}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(tier.tier)}
            className={cn(
              "flex-1 rounded-[10px] border px-[2px] py-[9px] text-center text-[10px] font-extrabold",
              selected
                ? cn(TIER_SELECTED_CLASSES[tier.color], "text-white")
                : cn("border-border-input bg-input", TIER_TEXT_CLASSES[tier.color]),
            )}
          >
            {SHORT_LABELS[tier.color]}
            <br />
            <span className={selected ? "text-white" : "text-amber-text"}>
              {tier.coins}
            </span>
          </button>
        );
      })}
    </div>
  );
}

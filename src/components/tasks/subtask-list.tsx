import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import type { Subtask } from "@/generated/prisma/client";

/**
 * SUB-01 — subtask list on the task edit screen. Matches the "Task detail /
 * edit" frame's SUBTASKS block exactly: `bg-warm` rows, 18px completion
 * circle, strikethrough title once done, coin share on the right.
 *
 * Read-only. The checkbox reflects `completedAt` but isn't interactive —
 * completing a subtask is SUB-03/SUB-05, and "+ Add" (SUB-02/SUB-04) is an
 * inert label, same stub pattern TASK-02's create sheet used for TASK-08.
 * The list has no fixed height and simply grows with `subtasks.length`,
 * which is what the ticket's "expandable" means here — the mock has no
 * accordion/collapse affordance for this block.
 *
 * The coin figure is a preview of SUB-03/SUB-05's proportional split (each
 * subtask earns `parentCoins / subtasks.length`, floored) — the reward text
 * the mock shows next to each row, not a value this component computes to be
 * authoritative; SUB-05's actual grant is server-side.
 */
export function SubtaskList({
  subtasks,
  parentCoins,
}: {
  subtasks: Subtask[];
  parentCoins: number;
}) {
  const shareCoins =
    subtasks.length > 0 ? Math.floor(parentCoins / subtasks.length) : 0;

  return (
    <div>
      <div className="mb-[10px] flex items-center justify-between">
        <span className="text-[11px] font-extrabold tracking-[0.4px] text-ink-soft">
          SUBTASKS
        </span>
        <span className="text-[11px] font-bold text-terracotta">+ Add</span>
      </div>

      {subtasks.length === 0 ? (
        <p className="text-[12.5px] text-ink-disabled">No subtasks yet.</p>
      ) : (
        <ul className="flex flex-col gap-[7px]">
          {subtasks.map((subtask) => {
            const done = subtask.completedAt !== null;
            return (
              <li
                key={subtask.id}
                className="flex items-center gap-[10px] rounded-[11px] border border-border-track bg-warm px-[11px] py-[9px]"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-[18px] flex-none items-center justify-center rounded-full",
                    done ? "bg-sage" : "border-2 border-checkbox",
                  )}
                >
                  {done ? (
                    <Check size={11} strokeWidth={3} className="text-surface" />
                  ) : null}
                </span>
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
    </div>
  );
}

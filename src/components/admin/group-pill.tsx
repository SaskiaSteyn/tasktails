import type { AbGroup } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";

/**
 * ADM-04's "shows each participant's assigned group" — a pill, same shape
 * the design draws on the per-user detail card. Only place in the admin
 * dashboard `--color-urgency` legitimately appears outside a destructive
 * action: AGENTS.md reserves it for "Group B false-urgency elements", and a
 * researcher's own view of who is in which arm is exactly that reservation,
 * not a violation of it.
 */
export function GroupPill({ group }: { group: AbGroup }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-pill px-[10px] py-[3px] text-[11px] font-bold",
        group === "A" ? "bg-sage-tint text-sage-text" : "bg-urgency-tint text-urgency-text",
      )}
    >
      GROUP {group}
    </span>
  );
}

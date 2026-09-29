"use client";

import { AlarmClock } from "lucide-react";
import { useEffect, useState } from "react";

import { format } from "@/components/economy/cooldown-countdown";
import { cn } from "@/lib/cn";
import { deadlineOf } from "@/lib/day";

/**
 * #336 — live countdowns to a task's deadline, once it is within 24 hours:
 * `DueCountdown` is the pill on the task card, `DueSoonBanner` the banner on
 * the edit screen. Amber, then the muted urgency tint for the last half hour.
 * That is a deliberate exception to "urgency red is Group B only", the user's
 * call — it marks a genuine deadline, and it is the tint, never the solid red
 * the shop's stimuli use.
 *
 * Both render nothing until mounted, same reason as `CooldownCountdown`: the
 * server and client would otherwise disagree on the remaining time. Once the
 * deadline passes they read "Overdue" rather than counting up.
 *
 * ponytail: one 1s interval per mounted countdown — fine for a task list; a
 * shared clock context if a page ever shows hundreds.
 */

const DUE_SOON_MS = 24 * 60 * 60 * 1000;
const SECONDS_FROM_MS = 30 * 60 * 1000;

/** `1h 55m` / `45m` until the last half hour, then a ticking `M:SS`. */
function countdown(remainingMs: number): string {
  if (remainingMs < SECONDS_FROM_MS) return format(remainingMs);
  const totalMinutes = Math.floor(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  return hours > 0 ? `${hours}h ${totalMinutes % 60}m` : `${totalMinutes}m`;
}

/** Milliseconds left (negative once overdue) while the deadline is within 24h or past, else null. */
function useRemaining(dueDate: Date | null): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!dueDate) return;
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [dueDate]);

  if (!dueDate || now === null) return null;
  const remaining = deadlineOf(dueDate).getTime() - now;
  return remaining <= DUE_SOON_MS ? remaining : null;
}

const TONE = {
  soon: "border-amber/40 bg-amber-tint text-amber-text",
  final: "border-urgency-border bg-urgency-tint text-urgency-text",
};

export function DueCountdown({ dueDate }: { dueDate: Date | null }) {
  const remaining = useRemaining(dueDate);
  if (remaining === null) return null;

  return (
    <span
      role={remaining > 0 ? "timer" : undefined}
      aria-label={remaining > 0 ? `Due in ${countdown(remaining)}` : undefined}
      className={cn(
        "flex flex-none items-center gap-1 rounded-[6px] border px-[6px] py-px text-[10px] font-extrabold tabular-nums",
        TONE[remaining < SECONDS_FROM_MS ? "final" : "soon"],
      )}
    >
      <AlarmClock size={11} strokeWidth={2.4} aria-hidden />
      {remaining > 0 ? countdown(remaining) : "Overdue"}
    </span>
  );
}

export function DueSoonBanner({ dueDate, className }: { dueDate: Date | null; className?: string }) {
  const remaining = useRemaining(dueDate);
  if (remaining === null) return null;

  return (
    <div
      className={cn(
        "flex flex-none items-center gap-2 rounded-card border px-3 py-[10px] text-[12.5px] font-bold",
        TONE[remaining < SECONDS_FROM_MS ? "final" : "soon"],
        className,
      )}
    >
      <AlarmClock size={16} className="flex-none" aria-hidden />
      <p className="min-w-0 flex-1">{remaining > 0 ? "Due soon" : "Overdue"}</p>
      {remaining > 0 ? (
        <span
          role="timer"
          aria-label={`Due in ${countdown(remaining)}`}
          className="flex-none font-display text-[14px] font-semibold tabular-nums"
        >
          {countdown(remaining)}
        </span>
      ) : null}
    </div>
  );
}

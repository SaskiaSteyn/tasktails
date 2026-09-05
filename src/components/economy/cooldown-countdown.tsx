"use client";

import { useEffect, useRef, useState } from "react";

/**
 * #224 — a live `M:SS` countdown to an absolute timestamp, for the earning
 * cooldown. Two mount points, one behaviour: the header's `EarningPill` and
 * the task screen's cooldown banner.
 *
 * Same pattern as the store's `FlashSaleBanner` (URG-01): `until` is an ISO
 * string decided on the server (`earningCooldownUntil`), the client renders
 * `until − now` every second, and it renders nothing until mounted so the
 * server and client don't disagree on the first second. `onExpire` fires once
 * the target passes — the callers `router.refresh()` from it to reconcile the
 * real state. Held in a ref so an inline `onExpire` doesn't restart the
 * interval every render.
 */
function format(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function CooldownCountdown({
  until,
  onExpire,
  className,
}: {
  /** ISO timestamp earning resumes. */
  until: string;
  onExpire?: () => void;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    firedRef.current = false;
    const target = new Date(until).getTime();
    // Deferred initial set, same `react-hooks/set-state-in-effect` avoidance
    // `FlashSaleBanner` documents.
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= target && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    }, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [until]);

  if (now === null) return null;

  const remainingMs = new Date(until).getTime() - now;
  return (
    <span
      role="timer"
      aria-label={`Earning resumes in ${format(remainingMs)}`}
      className={className}
    >
      {format(remainingMs)}
    </span>
  );
}

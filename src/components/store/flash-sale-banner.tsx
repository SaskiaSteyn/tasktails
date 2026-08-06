"use client";

import { Zap } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * URG-01 — the Group B flash-sale countdown banner, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Store — Group B" frame (pin 1,
 * "Flash sale · everything 20% off"). Only ever rendered by `StorePage`
 * (`src/app/store/page.tsx`) inside a `groupGatedData()` check — this
 * component itself has no knowledge of the study group, per `study-group.ts`'s
 * rule that group-dependent markup is decided on the server and the losing
 * branch never reaches the client.
 *
 * Window and expiry behaviour were not specified in Requirements.md or
 * claude-memory/ (the mock's own prototype hardcodes a static demo value) —
 * confirmed with the user rather than guessed: randomises within 5–15 minutes
 * on mount ("resets on page load"), then loops to a fresh random value in the
 * same window on hitting 0:00 rather than freezing or disappearing, since all
 * urgency data is fabricated and there is no real deadline to expire (§4).
 *
 * Renders nothing until mounted rather than picking the random value during
 * render — the same class of hydration mismatch STOR-02/03 already hit once
 * (locale-dependent formatting differing between the server and browser)
 * would otherwise happen here too, since the server and client would each
 * pick their own random starting second.
 */

const MIN_SECONDS = 5 * 60;
const MAX_SECONDS = 15 * 60;

function randomWindowSeconds(): number {
  return Math.floor(Math.random() * (MAX_SECONDS - MIN_SECONDS + 1)) + MIN_SECONDS;
}

/** `872` → `"14:32"` — minutes unpadded, seconds always two digits. */
function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function FlashSaleBanner() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    // Deferred via `setTimeout`, not called directly in the effect body —
    // `react-hooks/set-state-in-effect` flags a synchronous setState here,
    // and the 0ms defer is otherwise inconsequential (still fires before the
    // first paint the user can react to).
    const initial = setTimeout(() => setSecondsLeft(randomWindowSeconds()), 0);
    const interval = setInterval(() => {
      setSecondsLeft((current) =>
        current === null || current <= 0 ? randomWindowSeconds() : current - 1,
      );
    }, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  if (secondsLeft === null) return null;

  return (
    <div className="mb-[9px] flex items-center justify-between gap-2 rounded-input bg-urgency px-3 py-2 text-white">
      <span className="flex items-center gap-1 text-[12px] font-extrabold">
        <Zap size={14} strokeWidth={2.2} aria-hidden />
        Flash sale · everything 20% off
      </span>
      {/* No `aria-live`: a per-second announcement would spam screen reader
          users. `role="timer"` and the label are still there for anyone who
          navigates onto the element directly. */}
      <span
        role="timer"
        aria-label={`Sale ends in ${formatCountdown(secondsLeft)}`}
        className="rounded-[7px] bg-black/[.18] px-2 py-[2px] font-display text-[14px] font-semibold"
      >
        {formatCountdown(secondsLeft)}
      </span>
    </div>
  );
}

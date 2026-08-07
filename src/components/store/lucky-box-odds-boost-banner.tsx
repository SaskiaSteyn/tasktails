"use client";

import { useEffect, useState } from "react";

/**
 * GACHA-11 — the Group B currency-urgency banner for the Lucky Box card
 * ("Double your Legendary chance today"), per the approved gacha design
 * board (`Beta/Planning/TaskTails Screens - Gacha.html` §1, rev.3, pin 7 —
 * the same currency-urgency pattern `CurrencyUrgencyBadge` (URG-07) already
 * uses, reworded so it reads as a probability boost rather than a count of
 * items already received — see the design board's own revision note on
 * that exact wording).
 *
 * The countdown itself reuses `FlashSaleBanner`'s (URG-01) already-confirmed
 * behaviour verbatim rather than asking the same window/reset question
 * again: randomises within 5–15 minutes on mount ("resets on page load"),
 * loops to a fresh random value on hitting 0:00. `GACHA-09`'s own doc
 * comment already commits to this being self-contained and
 * server-uncomputed, for the same reason `FlashSaleBanner` is — there is no
 * real deadline to expire, only a fabricated one (§4).
 *
 * No icon, unlike `FlashSaleBanner` — the approved design board draws this
 * banner as plain bold text + a countdown chip, with nothing in the icon
 * slot; matched as drawn rather than borrowing `FlashSaleBanner`'s `Zap`
 * out of habit.
 */

const MIN_SECONDS = 5 * 60;
const MAX_SECONDS = 15 * 60;

function randomWindowSeconds(): number {
  return Math.floor(Math.random() * (MAX_SECONDS - MIN_SECONDS + 1)) + MIN_SECONDS;
}

/** `872` → `"14:32"` — minutes unpadded, seconds always two digits. Same formatting `FlashSaleBanner` uses. */
function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function LuckyBoxOddsBoostBanner() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    // Deferred via `setTimeout`, not called directly in the effect body —
    // same `react-hooks/set-state-in-effect` reasoning `FlashSaleBanner`
    // documents for its own identical deferral.
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
    <div className="mb-[6px] flex items-center justify-between gap-2 rounded-[9px] bg-urgency px-[10px] py-[6px] text-white">
      <span className="text-[10px] font-extrabold">Double your Legendary chance today</span>
      <span
        role="timer"
        aria-label={`Offer ends in ${formatCountdown(secondsLeft)}`}
        className="rounded-[6px] bg-black/[.18] px-[7px] py-[2px] font-display text-[12px] font-semibold"
      >
        {formatCountdown(secondsLeft)}
      </span>
    </div>
  );
}

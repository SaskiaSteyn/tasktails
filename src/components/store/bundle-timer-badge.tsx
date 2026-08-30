"use client";

import { useEffect, useState } from "react";

/**
 * URG-06 — the Group B bundle-timer note, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Store — Group B" frame (pin
 * 6): "Buy 2 get 1 · MM:SS" on a violet pill.
 *
 * **Relocated 2026-08-25 (#202, "labels are all over the place")**:
 * originally rendered in a second card slot below the category label — not
 * a position `design_handoff` draws anywhere. Renders through
 * `StoreItemCard`'s `footerNote` slot now — below the image, above the
 * price row, same spot `RecentPurchasesBadge`/`UrgencyLanguageNote` use —
 * rather than the top-right corner a first attempt at this fix tried: a
 * pill this wide absolutely positioned over the art region read as a banner
 * smeared across the image (confirmed live via screenshot), not the small
 * "Only 3 left!"-style tag that slot is for. Still mutually exclusive with
 * `UrgencyLanguageNote` (URG-05) and `CurrencyUrgencyBadge` (URG-07) —
 * `urgencyDataForItems()`'s `noteSelection` seed (URG-08) guarantees at
 * most one of the three is ever passed down.
 *
 * A client component — unlike the other two note types, this one ticks, same
 * reasoning as `FlashSaleBanner` (URG-01). Randomises within 3–8 minutes on
 * mount, narrower than URG-01's 5–15 (confirmed with the user): the mock's
 * own static demo values differ between the two timers (~14:32 vs ~4:59),
 * suggesting the bundle deal is meant to read as a tighter, more pressured
 * window than the general flash sale. Loops to a fresh random value on
 * hitting 0:00 rather than freezing or disappearing, same as URG-01 — all
 * urgency data is fabricated, so there's no real deadline to expire (§4).
 *
 * "Buy 2 get 1 free" is decorative copy only, like every other Group B
 * urgency stimulus (§4: "there is no real stock, real social activity, or
 * real deadline") — checkout applies no actual bundle discount.
 *
 * Renders nothing until mounted, same hydration-mismatch avoidance as
 * `FlashSaleBanner`: the server and client would otherwise each pick their
 * own random starting second.
 */

const MIN_SECONDS = 3 * 60;
const MAX_SECONDS = 8 * 60;

function randomWindowSeconds(): number {
  return Math.floor(Math.random() * (MAX_SECONDS - MIN_SECONDS + 1)) + MIN_SECONDS;
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function BundleTimerBadge() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    // Deferred via `setTimeout`, not called directly in the effect body —
    // see `FlashSaleBanner`'s own comment on `react-hooks/set-state-in-effect`.
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
    <p
      role="timer"
      aria-label={`Buy 2 get 1 free, offer ends in ${formatCountdown(secondsLeft)}`}
      className="mb-[7px] mt-[2px] inline-block rounded-[7px] bg-violet px-[6px] py-[3px] text-[9px] font-extrabold text-white"
    >
      Buy 2 get 1 · {formatCountdown(secondsLeft)}
    </p>
  );
}

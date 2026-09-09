"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * The coin (INF-12).
 *
 * Now `public/coin.svg` — the real drawn coin, supplied 2026-09-05, replacing
 * the CSS mark this rendered before (an amber disc with a lighter ring, built
 * from `@theme` tokens because the handoff described the coin in words and no
 * artwork existed yet). Every call site goes through this component, so the
 * swap is one file; nothing passes `className`, and the sizes callers ask for
 * (12/13/14/18px) are unchanged.
 *
 * `.svg` is served straight from `public/` rather than through the image
 * optimizer — Next skips optimization for SVG automatically — so this is one
 * cached 4KB file for every coin on the page, not a per-size variant.
 *
 * Decorative on its own. The label that gives it meaning lives on whatever
 * wraps it (see `CoinPill`), so this is always `aria-hidden`.
 */
export function Coin({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/coin.svg"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn("block flex-none", className)}
    />
  );
}

/**
 * Coin balance pill — white fill, track border, radius 20. On every logged-in
 * screen (TASK-09, STOR-08).
 *
 * Padding is asymmetric in the designs (more on the value side than the coin
 * side) because the coin is already visually inset by its ring.
 *
 * #256 — the number rolls to a new balance rather than snapping to it. The
 * ticket asks for it on `/profile/sell` ("let the coins count up, like rolling
 * numbers to show it went up"), but the complaint behind it is general: every
 * screen that sells, buys or earns already re-renders this pill through a
 * `router.refresh()` and the balance silently changed under the participant.
 * Animating here rather than at one call site means the store's checkout and
 * the sell screen both get the same feedback from one place — and it is why this file is now `"use client"`: a server-rendered
 * number cannot notice it changed.
 */
/** How long a roll takes. Long enough to read as movement, short enough that the number is settled before a participant looks away. */
const ROLL_MS = 700;

function useRollingNumber(value: number): number {
  const [shown, setShown] = useState(value);
  // The value the last roll ended on, not `shown` — reading `shown` inside the
  // effect would restart the roll on every frame it sets.
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;

    // Accessibility basic, not a nicety: a number counting itself up is motion,
    // and `prefers-reduced-motion` means don't. A zero-length roll still goes
    // through the loop below — its first frame lands on the final value — so
    // the update stays inside the animation callback rather than firing
    // synchronously from the effect body (`react-hooks/set-state-in-effect`).
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : ROLL_MS;

    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min((now - began) / duration, 1);
      // Ease-out cubic — most of the distance early, so the last few coins
      // land visibly rather than the whole thing being over before it reads.
      setShown(Math.round(start + (value - start) * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}

export function CoinPill({
  coins,
  className,
}: {
  coins: number;
  className?: string;
}) {
  const shown = useRollingNumber(coins);

  return (
    <span
      // Screen readers get "245 coins"; sighted users get the amber mark. The
      // number alone would read as a bare digit with no unit. role="img" is what
      // makes the label win over the content — aria-label on a bare span is not
      // reliably exposed.
      role="img"
      // Locale pinned explicitly — `toLocaleString()` with no argument uses
      // the runtime's default locale, which can differ between the Node
      // server process and the browser (different OS/ICU locale data). That
      // mismatch is exactly what produced the hydration error found while
      // verifying STOR-03: the server rendered "1,200" and the client
      // rendered "1 200" for the same number, and React discarded the
      // subtree rather than reconcile text it can't diff. Every numeric
      // `toLocaleString()` call reachable from a hydrated page needs the
      // same fix — see `store-item-card.tsx` and `app-header.tsx`.
      aria-label={`${coins.toLocaleString("en-US")} coins`}
      className={cn(
        "inline-flex flex-none items-center gap-[5px] rounded-pill border border-border-track bg-surface py-[5px] pr-[10px] pl-[6px]",
        className,
      )}
    >
      <Coin size={18} />
      {/* The label reads the settled balance, the digits roll — a screen
          reader announcing every intermediate frame would be noise, and this
          is not a live region so it is only ever read once, on demand. */}
      <span className="text-[13px] font-extrabold text-amber-text">
        {shown.toLocaleString("en-US")}
      </span>
    </span>
  );
}

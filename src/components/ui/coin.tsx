import Image from "next/image";

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
 */
export function CoinPill({
  coins,
  className,
}: {
  coins: number;
  className?: string;
}) {
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
      <span className="text-[13px] font-extrabold text-amber-text">
        {coins.toLocaleString("en-US")}
      </span>
    </span>
  );
}

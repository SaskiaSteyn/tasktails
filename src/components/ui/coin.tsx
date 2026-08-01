import { cn } from "@/lib/cn";

/**
 * The coin (INF-12).
 *
 * Deliberately not a Lucide icon: the handoff specifies coins as "a filled amber
 * circle with a lighter ring", and it is the one mark in the app drawn from
 * tokens rather than the icon set. It appears at four sizes — 18px in the
 * dashboard header, 16px in the compact header, 13px on a task row's reward and
 * 18px on a store card — so the size is a prop rather than four near-copies.
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
    <span
      aria-hidden
      className={cn(
        "block flex-none rounded-full border-2 border-amber-ring bg-amber",
        className,
      )}
      style={{ width: size, height: size }}
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

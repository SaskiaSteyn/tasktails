import { Flame } from "lucide-react";

/**
 * GACHA-11 — the Group B "N opened in the last hour" line for the Lucky Box
 * card, per the approved gacha design board (pin 4 — the same
 * recent-purchases pattern `RecentPurchasesBadge` (URG-04) already uses for
 * ordinary catalogue items). `count` comes from `GACHA-09`'s
 * `luckyBoxUrgencyForUser()`, already gated through `groupGatedData()` by
 * the time it reaches here.
 *
 * Not a client component, same reasoning `RecentPurchasesBadge` gives for
 * itself: no ticking state, renders inline in normal flow rather than
 * absolutely positioned.
 */
export function LuckyBoxRecentPullsNote({ count }: { count: number }) {
  return (
    <p className="flex items-center gap-1 text-[9.5px] font-extrabold text-urgency">
      <Flame size={13} strokeWidth={2.2} aria-hidden />
      {count} opened in the last hour
    </p>
  );
}

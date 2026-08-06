import { Flame } from "lucide-react";

/**
 * URG-04 — the Group B "X sold in the last hour" line, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Store — Group B" frame (pin
 * 4). A different card slot from `StockBadge`/`CartActivityBadge` (URG-02/
 * URG-03): the mock draws this directly under the item name, in the exact
 * spot its own category label would otherwise sit — confirmed with the user
 * to render as an *additional* line below the already-shipped category label
 * instead, since silently dropping real category info for Group B (as the
 * mock's own layout would) was worse than diverging from it here.
 *
 * Not a client component and not self-positioned, same reasoning as
 * `StockBadge`: no ticking state, and this renders inline in normal flow
 * (`StoreItemCard`), not absolutely positioned like the corner badges.
 */
export function RecentPurchasesBadge({ count }: { count: number }) {
  return (
    <p className="mb-[7px] mt-[2px] flex items-center gap-1 text-[9.5px] font-extrabold text-urgency">
      <Flame size={13} strokeWidth={2.2} aria-hidden />
      {count} sold in the last hour
    </p>
  );
}

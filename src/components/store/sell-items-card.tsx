import { Coins } from "lucide-react";
import Link from "next/link";

/**
 * GACHA-16 — the "Sell items" card. **Moved from Profile to the Store by
 * #256**: "Sameet games a lot and also looked for selling items in the
 * store", so it now sits beside `LuckyBoxCard` in the store's top row
 * rather than under `BuyXpCard` on Profile, and both cards share one
 * compact portrait recipe (well, name, subtitle, action) at the same
 * footprint a `StoreItemCard` occupies in the two-column phone grid.
 *
 * The destination is still `/profile/sell` — the screen itself didn't move,
 * only the way in, and re-homing the route would cost a redirect for a URL
 * participants already have. ponytail: rename the route only if the profile
 * path itself starts confusing someone.
 *
 * A sage well and an outlined action, against the Lucky Box's amber well and
 * filled terracotta pill: the two cards are the same shape, so the colour is
 * what keeps "spend" and "get paid" apart, and it keeps a single primary
 * button in the row. Sage is already the sell colour — `SellItemsList`'s own
 * per-row Sell button uses it.
 */
export function SellItemsCard() {
  return (
    <div className="flex h-full flex-col rounded-card border border-border-track bg-warm p-[11px]">
      <div className="flex size-[44px] flex-none items-center justify-center rounded-[11px] bg-sage-tint">
        <Coins size={22} strokeWidth={2} className="text-sage-text" aria-hidden />
      </div>

      <p className="mt-[9px] text-[13px] font-extrabold">Sell items</p>
      <p className="mt-[3px] mb-[11px] text-[11px] font-bold text-ink-soft">
        Get 70% of an item&rsquo;s value back
      </p>

      <Link
        href="/profile/sell"
        className="mt-auto flex h-[32px] items-center justify-center rounded-[10px] border-[1.5px] border-terracotta font-display text-[12.5px] font-semibold text-terracotta hover:border-terracotta-hover hover:text-terracotta-hover"
      >
        Manage
      </Link>
    </div>
  );
}

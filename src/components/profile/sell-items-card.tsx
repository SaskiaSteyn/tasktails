import Link from "next/link";

/**
 * GACHA-16 — the "Sell items" card, per the approved design board's
 * "Profile · Sell items card" frame: sits directly under `BuyXpCard`
 * (PRO-06), same card recipe (rounded-[14px], px-[14px] py-[13px],
 * title/subtitle + a pill button on the right).
 *
 * Unlike `BuyXpCard`'s violet treatment — deliberately borderless per its
 * own doc comment, since the mock's `#E1D8F0` border has no `@theme` token
 * to reach for — this card's `bg-warm`/`border-border-track` pairing
 * already has real tokens and matches the design board exactly, so there's
 * no reason to drop the border here.
 *
 * "Manage" links to `/profile/sell` (`GACHA-17`) now that it exists —
 * shipped inert at first, same "render the control, wire it up later"
 * pattern `GACHA-10`'s Open button and `GACHA-12`'s info icon both used
 * before their own destinations existed.
 */
export function SellItemsCard() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-border-track bg-warm px-[14px] py-[13px]">
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold">Sell items</p>
        <p className="text-[11px] font-bold text-ink-soft">Get 70% of an item&rsquo;s value back</p>
      </div>

      <Link
        href="/profile/sell"
        className="flex h-[34px] flex-none items-center justify-center rounded-[10px] border-[1.5px] border-terracotta px-[15px] font-display text-[13px] font-semibold text-terracotta hover:border-terracotta-hover hover:text-terracotta-hover"
      >
        Manage
      </Link>
    </div>
  );
}

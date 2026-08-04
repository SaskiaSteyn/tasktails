/**
 * URG-03 — the Group B "N in carts" cart-activity badge, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Store — Group B" frame (pin
 * 3). Copy and colour follow the mock's own badge exactly ("5 in carts",
 * amber `#E5A93C`) over Features.md's own looser "N people have this in
 * their cart" wording and Requirements.md §4's "5 people have this in their
 * cart" — design_handoff is the authoritative visual source per AGENTS.md.
 *
 * Not a client component and not self-positioned, same reasoning as
 * `StockBadge`: no ticking state, and `StoreItemCard`'s single absolute
 * top-right wrapper is what stacks this against `StockBadge` when an item
 * shows both.
 */
export function CartActivityBadge({ count }: { count: number }) {
  return (
    <span className="rounded-pill bg-amber px-[7px] py-[2px] text-[9px] font-extrabold text-white">
      {count} in carts
    </span>
  );
}

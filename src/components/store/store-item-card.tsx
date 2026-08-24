"use client";

import { Check, X } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import { useCartCount } from "@/components/store/cart-count-context";
import { ItemWell, itemSubtitle } from "@/components/store/item-visual";
import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";
import type { StoreItemWithLock } from "@/lib/store";

/**
 * STOR-01's item card — per-item name, image, coin price, level requirement
 * and availability, matching `design_handoff/TaskTails Screens.dc.html`'s
 * "Store — Group A" frame (STORE item card).
 *
 * The locked-card visual (STOR-04) — desaturated fill, a lock glyph in the
 * art region and an "Unlocks at level N" footer line — replaces STOR-01's
 * plain "Lvl N" label now that this ticket owns it. `#F2EEE7`/`#E9E3D9` (the
 * desaturated card/well fills) have no `@theme` token — nothing else in the
 * design uses this specific muted neutral — so they're arbitrary values,
 * same as `zoo-gallery-card.tsx`'s own raw-hex `border-[#F4D9C9]` for its own
 * no-token accent. The mock draws the lock glyph as hand-built CSS shapes;
 * `ItemWell` uses `lucide-react`'s `Lock` instead, same "real icon, not a
 * drawn shape" call the seed data's own comment already made for the
 * unlocked wells. The footer line lost its pill background and inline lock
 * icon with `ADDENDUM-store-zoo-art.md` — the padlock now reads once, large,
 * in the art region, and repeating it 13px-high in the footer was the mock's
 * pre-addendum layout, not this one's.
 *
 * The "+" is now a real add-to-cart button (STOR-05), posting to STOR-12's
 * `POST /api/store/cart`. Only ever rendered unlocked (a locked card shows
 * the "Unlocks at Lvl N" pill in this same slot instead), so the 403 that
 * route can return for a locked item is a state this button can never
 * actually trigger — nothing here handles it beyond the generic error path.
 * On success, also calls `useCartCount()`'s `increment()` — found live after
 * STOR-06 shipped that the header's cart badge only reflected the count as
 * of the last page load, since it and this button are siblings in the tree
 * with no prop path between them. See `cart-count-context.tsx`. Still no
 * `router.refresh()`: nothing else on `/store` needs a full re-fetch for a
 * cart add, so the context update is the only thing that has to happen.
 *
 * The category→colour/icon mapping (`CATEGORY_LABEL`, the well itself) lives
 * in `item-visual.tsx` now — factored out when STOR-06's cart rows needed
 * the exact same treatment, so there's one definition instead of two that
 * could drift.
 *
 * `badge` (URG-02/URG-03) is an inert slot, not a fixed component:
 * `StorePage` decides server-side which of `<StockBadge />`/
 * `<CartActivityBadge />` an item gets — at most one, per
 * `urgencyDataForItems()`'s `badgeSelection` — plus two curated exceptions
 * from `design_handoff/ADDENDUM-store-zoo-art.md`'s own art (`<BuyOneGetOneBadge
 * />` for Red collar, `<CurrencyUrgencyBadge overlay />` for Hearts), and
 * only ever unlocked items get one (advertising urgency on something you
 * can't yet buy reads as nonsensical, same call STOR-05's add-to-cart button
 * already made for its own unlocked-only rendering) — this component just
 * renders whatever it's handed, same as `StoreBrowser`'s own
 * `flashSaleBanner` prop. The wrapper around `{badge}` is the card's *only*
 * `position: absolute` element in this corner; every badge component is a
 * plain, unpositioned pill, so the wrapper's `flex flex-col items-end gap-1`
 * still stacks two correctly (Sunflower seeds' curated stock+cart pair)
 * without any special-casing.
 *
 * `design_handoff/ADDENDUM-store-zoo-art.md` adds two more inert slots, both
 * still decided server-side by `StorePage`, same "study-group-aware markup
 * never reaches client code as a boolean" rule: `footerNote` sits above the
 * price row — the addendum's "social-proof line above the price" — for
 * whichever of `<RecentPurchasesBadge />` (URG-04)/`<UrgencyLanguageNote
 * />` (URG-05)/`<BundleTimerBadge />` (URG-06)/`<CurrencyUrgencyBadge />`
 * (URG-07, its default non-`overlay` form) an item's `noteSelection` picked
 * — **fixed 2026-08-25 (#202, "labels are all over the place")**: the
 * latter three used to render through a *third* card slot instead (below
 * the category label), a position `design_handoff` never actually draws;
 * removed entirely rather than left unused, since the addendum's own
 * placement is only ever these two spots per card, never three. `pricing`
 * swaps the plain price for a struck-through list price beside a bold sale
 * price (`fakeDiscountPricing()` in `urgency.ts`) — display only, the "+"
 * button still adds `item.coinPrice` itself to the cart.
 *
 * A locked card is now a real `<button>` (SHR-06): tapping it calls
 * `onLockedClick`, which `StoreBrowser` uses to show the full-screen
 * "locked by level" state in place of the grid. Unlocked cards stay a plain
 * `<div>` — their own interactive part is the "+" button, and a card cannot
 * itself be a `<button>` while nesting one.
 */

/** How long the post-click checkmark/error state stays up before reverting to "+". */
const FEEDBACK_MS = 1200;

export function StoreItemCard({
  item,
  badge,
  footerNote,
  pricing,
  onLockedClick,
}: {
  item: StoreItemWithLock;
  /** Overlaid on the art region, top-right — one badge, or several stacked. */
  badge?: ReactNode;
  /** Stacked above the price row in the footer, e.g. a "sold in the last hour" social-proof line. */
  footerNote?: ReactNode;
  /** Group-B fake discount (`fakeDiscountPricing()`) — struck list price beside a bold sale price, replacing the plain `item.coinPrice` display. Display only; the "+" button still charges `item.coinPrice`. */
  pricing?: { list: number; sale: number };
  /** SHR-06 — only ever called for a locked card; unlocked cards have no use for it. */
  onLockedClick?: () => void;
}) {
  const locked = item.locked;
  const [status, setStatus] = useState<"idle" | "pending" | "added" | "error">("idle");
  // Tracks the pending revert-to-idle timer so a second click's own timer
  // can't be cut short by the first click's — without this, clicking twice
  // within `FEEDBACK_MS` would have the first click's stale timeout reset
  // the second click's still-fresh "added"/"error" state back to idle early.
  const revertTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const cart = useCartCount();

  async function handleAddToCart() {
    if (status === "pending") return;
    if (revertTimer.current) clearTimeout(revertTimer.current);
    setStatus("pending");
    try {
      const response = await fetch("/api/store/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeItemId: item.id }),
      });
      setStatus(response.ok ? "added" : "error");
      if (response.ok) cart?.increment();
    } catch {
      setStatus("error");
    } finally {
      revertTimer.current = setTimeout(() => setStatus("idle"), FEEDBACK_MS);
    }
  }

  const cardClassName = cn(
    "relative flex w-full flex-col overflow-hidden rounded-card border border-border-track",
    // `bg-surface` (white), not the old `bg-warm` cream tint the pre-addendum
    // card used for its whole body — per the addendum's card art, the card
    // itself is plain white and only the art tile inside it carries a pale
    // category tint (`ItemWell`'s own fill).
    locked ? "bg-[#F2EEE7] text-left transition-colors duration-120 hover:border-checkbox" : "bg-surface",
  );

  const content = (
    <>
      {/* Header — title + subtitle above the art, per the addendum's card
          structure ("header → art tile → footer"). The pre-addendum card had
          these below the well; the addendum's own mock cards lead with the
          name, and the art tile now spans the card's full width rather than
          sitting inset above the text. */}
      <div className="px-[11px] pt-[10px] pb-[9px]">
        <p
          className={cn(
            "truncate text-[12.5px] font-extrabold",
            locked && "text-ink-disabled",
          )}
        >
          {item.name}
        </p>
        <p className={cn("text-[10px]", locked ? "text-ink-disabled" : "text-ink-faint")}>
          {itemSubtitle(item)}
        </p>
      </div>

      {/* Art region — full-bleed (no card padding around it, no corner
          radius of its own): the addendum draws it edge-to-edge between the
          header and the footer, so its own fill is what separates the two
          rather than a drawn border. `overflow-hidden` on the card clips it
          against the card's rounded corners; it never touches them anyway
          with a header above and a footer below.

          No `mt-auto` here (removed — it used to push this region down to
          meet the footer at the bottom of the card). `StoreBrowser`'s grid
          stretches every card in a row to match its tallest neighbour
          (Grid's default `align-items: stretch`), and a card whose footer
          has a `footerNote` line (URG-04/05/06/07) is taller than a
          row-mate without one; `mt-auto` absorbed exactly that difference as
          blank margin *above* this region — a visible gap between the title
          and the art with no drawn cause, reported live. `StoreBrowser`'s
          `items-start` on the grid is the real fix (each card now sizes to
          its own content instead of stretching at all); this class was the
          other half of the same hack and is dead weight without it. */}
      <div className="relative">
        {badge && (
          <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
            {badge}
          </div>
        )}
        <ItemWell
          item={item}
          locked={locked}
          size={82}
          iconSize={locked ? 40 : 32}
          animalIconSize={54}
          rounded="rounded-none"
          fullWidth
        />
      </div>

      <div className="border-t border-border-track px-[11px] py-[10px]">
        {footerNote}

        {locked ? (
          /* Plain centred line, not the pre-addendum lock-icon pill — the
             addendum's locked card puts the padlock in the art region above
             and leaves the footer as bare text ("Unlocks at level 7"). */
          <p className="text-center text-[11px] font-extrabold text-ink-soft">
            Unlocks at level {item.levelRequired}
          </p>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-[4px]">
              <Coin size={12} />
              {pricing ? (
                <span className="flex items-baseline gap-[5px]">
                  <span className="text-[10px] font-bold text-ink-disabled line-through">
                    {pricing.list.toLocaleString("en-US")}
                  </span>
                  <span className="text-[12px] font-extrabold text-amber-text">
                    {pricing.sale.toLocaleString("en-US")}
                  </span>
                </span>
              ) : (
                <span className="text-[12px] font-extrabold text-amber-text">
                  {/* Locale pinned explicitly — see `coin.tsx`'s `CoinPill` for
                      the hydration mismatch this avoids. */}
                  {item.coinPrice.toLocaleString("en-US")}
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={status === "pending"}
              aria-label={`Add ${item.name} to cart`}
              className={cn(
                "flex size-[28px] flex-none items-center justify-center rounded-[9px] text-[16px] leading-none text-white transition-colors duration-120",
                status === "error"
                  ? "bg-urgency"
                  : status === "added"
                    ? "bg-sage"
                    : "bg-terracotta hover:bg-terracotta-hover disabled:opacity-70",
              )}
            >
              {status === "added" ? (
                <Check size={14} strokeWidth={2.6} aria-hidden />
              ) : status === "error" ? (
                <X size={14} strokeWidth={2.6} aria-hidden />
              ) : (
                <span aria-hidden>+</span>
              )}
            </button>

            {/* Visual-only for "pending"/"idle" — the icon swap on the button
                itself is silent to a screen reader, so the outcome that
                matters (added or failed) gets announced here instead. */}
            <span role="status" aria-live="polite" className="sr-only">
              {status === "added"
                ? `Added ${item.name} to cart`
                : status === "error"
                  ? `Couldn't add ${item.name} to cart`
                  : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );

  return locked ? (
    <button
      type="button"
      onClick={onLockedClick}
      aria-label={`${item.name}, locked until level ${item.levelRequired}`}
      className={cardClassName}
    >
      {content}
    </button>
  ) : (
    <div className={cardClassName}>{content}</div>
  );
}

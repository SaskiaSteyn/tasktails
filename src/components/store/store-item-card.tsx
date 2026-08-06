"use client";

import { Check, Lock, X } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import { useCartCount } from "@/components/store/cart-count-context";
import { CATEGORY_LABEL, ItemWell } from "@/components/store/item-visual";
import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";
import type { StoreItemWithLock } from "@/lib/store";

/**
 * STOR-01's item card — per-item name, image, coin price, level requirement
 * and availability, matching `design_handoff/TaskTails Screens.dc.html`'s
 * "Store — Group A" frame (STORE item card).
 *
 * The locked-card visual (STOR-04) — desaturated fill, lock icon, "Unlocks
 * at Lvl N" pill — replaces STOR-01's plain "Lvl N" label now that this
 * ticket owns it. `#F2EEE7`/`#E9E3D9` (the desaturated card/well fills) have
 * no `@theme` token — nothing else in the design uses this specific muted
 * neutral — so they're arbitrary values, same as `zoo-gallery-card.tsx`'s
 * own raw-hex `border-[#F4D9C9]` for its own no-token accent. The mock draws
 * the lock glyph as hand-built CSS shapes; this uses `lucide-react`'s `Lock`
 * instead, same "real icon, not a drawn shape" call the seed data's own
 * comment already made for the unlocked wells.
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
 * `badge` (URG-02/URG-03) is an inert slot, not a stock/cart number:
 * `StorePage` decides server-side which one of `<StockBadge />`/
 * `<CartActivityBadge />` an item gets — mutually exclusive, per the user
 * (2026-08-04, after both tickets had already shipped allowing both at
 * once) — and only ever unlocked items get one (advertising urgency on
 * something you can't yet buy reads as nonsensical, same call STOR-05's
 * add-to-cart button already made for its own unlocked-only rendering) —
 * this component just renders whatever it's handed, same as `StoreBrowser`'s
 * own `flashSaleBanner` prop. The wrapper around `{badge}` is the card's
 * *only* `position: absolute` element in this corner; `StockBadge`/
 * `CartActivityBadge` are plain, unpositioned pills, so the wrapper still
 * lays out a single child correctly without any special-casing.
 *
 * `note` (URG-04) is a second, independent inert slot for
 * `<RecentPurchasesBadge />` — a different card position from `badge`
 * (inline below the category label, not the absolute top-right corner), so
 * it renders directly in the card's normal flow rather than through the
 * `badge` wrapper. Same "unlocked only" rule as `badge`.
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
  note,
  onLockedClick,
}: {
  item: StoreItemWithLock;
  badge?: ReactNode;
  note?: ReactNode;
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
    "relative w-full rounded-card border border-border-track px-[11px] py-3",
    locked ? "bg-[#F2EEE7] text-left transition-colors duration-120 hover:border-checkbox" : "bg-warm",
  );

  const content = (
    <>
      {badge && (
        <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
          {badge}
        </div>
      )}

      <ItemWell
        item={item}
        locked={locked}
        size={54}
        iconSize={26}
        animalIconSize={40}
        fullWidth
        className="mb-[9px]"
      />

      <p
        className={cn(
          "truncate text-[12.5px] font-extrabold",
          locked && "text-ink-disabled",
        )}
      >
        {item.name}
      </p>
      <p className="mb-2 text-[10.5px] text-ink-faint">{CATEGORY_LABEL[item.category]}</p>

      {note}

      {locked ? (
        <div className="flex items-center justify-center gap-[5px] rounded-[8px] bg-[#E9E3D9] py-[5px] text-[11px] font-extrabold text-ink-soft">
          <Lock size={13} strokeWidth={2.4} aria-hidden />
          Unlocks at Lvl {item.levelRequired}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-[3px]">
            <Coin size={12} />
            <span className="text-[12px] font-extrabold text-amber-text">
              {/* Locale pinned explicitly — see `coin.tsx`'s `CoinPill` for
                  the hydration mismatch this avoids. */}
              {item.coinPrice.toLocaleString("en-US")}
            </span>
          </span>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={status === "pending"}
            aria-label={`Add ${item.name} to cart`}
            className={cn(
              "flex size-[26px] flex-none items-center justify-center rounded-[8px] text-[16px] leading-none text-white transition-colors duration-120",
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

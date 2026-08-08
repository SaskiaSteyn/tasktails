"use client";

import { PackageOpen } from "lucide-react";
import { useState } from "react";

import { CATEGORY_LABEL, ItemWell } from "@/components/store/item-visual";
import { cn } from "@/lib/cn";
import type { SellableItem } from "@/lib/sell";

/**
 * GACHA-17 — the Sell Items screen's list, per the approved design board's
 * "Sell items" frame. `SellItemsPage` supplies the header and the initial
 * `sellableItemsForUser()` read (`GACHA-08`); this component owns selling
 * one row at a time against `POST /api/inventory/[id]/sell` (`GACHA-07`).
 *
 * "Selling calls GACHA-07 and removes the row from the list on success" is
 * the ticket's own wording, taken literally: a successful sell drops the row
 * from local state outright rather than decrementing a `quantity` shown
 * anywhere — neither the design board nor the ticket draws a `×N` count on
 * a row, so a stack of 3 needs three separate visits to fully clear, each
 * one a fresh `GET` on reload. Simpler than tracking a count this screen
 * never displays, and matches what's actually drawn.
 *
 * The locked row (Rhino in the mock) reuses `ItemWell`'s existing `locked`
 * prop as-is — the desaturated fill + `Lock` glyph it already draws for
 * `StoreItemCard` (STOR-04) is pixel-for-pixel the same treatment the mock
 * draws here, so no new variant was needed.
 */
export function SellItemsList({ initialItems }: { initialItems: SellableItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function handleSell(id: string) {
    if (pendingId) return;
    setPendingId(id);
    setErrorId(null);

    try {
      const response = await fetch(`/api/inventory/${id}/sell`, { method: "POST" });
      if (!response.ok) {
        setErrorId(id);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== id));
    } catch {
      setErrorId(id);
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          aria-hidden
          className="mb-4 flex size-16 items-center justify-center rounded-card-lg border-2 border-dashed border-checkbox bg-input"
        >
          <PackageOpen size={26} strokeWidth={1.8} className="text-ink-faint" />
        </div>
        <p className="font-display text-[17px] font-semibold">Nothing to sell yet</p>
        <p className="mt-[6px] text-[12.5px] text-ink-soft">
          Items you buy or pull will show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pt-[14px]">
        <div className="flex flex-col gap-[9px]">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-[11px] rounded-[14px] border border-border-track bg-warm p-[10px]"
            >
              <ItemWell
                item={item}
                locked={item.locked}
                size={44}
                iconSize={20}
                animalIconSize={32}
                rounded="rounded-[10px]"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-extrabold">
                  {item.name}
                  {item.locked && (
                    <span className="ml-[3px] rounded-[5px] bg-input px-[5px] py-px text-[9.5px] font-extrabold text-ink-soft">
                      LOCKED · LVL {item.levelRequired}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-ink-faint">
                  Bought for {item.coinPrice.toLocaleString("en-US")}
                </p>
                {errorId === item.id && (
                  <p role="alert" className="mt-[2px] text-[10px] font-bold text-urgency-text">
                    Couldn&rsquo;t sell {CATEGORY_LABEL[item.category].toLowerCase()}. Try again.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSell(item.id)}
                disabled={pendingId === item.id}
                className={cn(
                  "flex flex-none items-center gap-1 rounded-[10px] bg-sage px-3 py-[7px]",
                  "font-display text-[12px] font-semibold text-white transition-colors duration-120 ease-out",
                  "hover:not-disabled:bg-sage-hover disabled:opacity-60",
                )}
              >
                {pendingId === item.id ? "Selling…" : `Sell · +${item.sellValue.toLocaleString("en-US")}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="flex-none border-t border-border-track bg-warm px-[18px] py-[14px] text-[11px] leading-[1.5] text-ink-soft">
        Everything you own can be sold — including animals you haven&rsquo;t unlocked yet. Selling
        removes the item from your account for good.
      </p>
    </>
  );
}

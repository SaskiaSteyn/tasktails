import Image from "next/image";
import type { ReactNode } from "react";

import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";
import { itemCountLabel, type LuckyBoxDefinition } from "@/lib/lucky-boxes";

/**
 * The box artwork (`design_handoff_lucky_boxes` UPDATE-02 §1), sized by
 * height. Art, not an icon — below ~26px it stops reading, so the header
 * button keeps lucide's `Gift`.
 */
export function BoxArt({
  open = false,
  height,
  className,
}: {
  open?: boolean;
  height: number;
  className?: string;
}) {
  return (
    <Image
      src={open ? "/open-box.svg" : "/closed-box.svg"}
      alt=""
      aria-hidden
      // The SVGs' own viewBox proportions. `public/` art, which is what is
      // synced to S3 — not the handoff's bundled copies.
      width={open ? 715 : 720}
      height={open ? 1060 : 840}
      style={{ height, width: "auto" }}
      className={cn("block", className)}
    />
  );
}

/**
 * A box in the store's Lucky boxes group (1a). The shipped `StoreItemCard`'s
 * anatomy — art tile first, name and sub, price row — rather than the
 * board's header-first card, because the shipped card is the source of truth
 * and the two sit in the same column. Not `StoreItemCard` itself: that card
 * is a catalogue row with a cart button, and a box is neither.
 *
 * Untiered (README §2): plain `border-track` frame, no chip, no effects. The
 * box's contents are tiered; the box is not.
 *
 * The whole card opens the buy sheet, so the tap target is an `inset-0`
 * button (the pattern the locked store card uses, #260) and the "+" is
 * drawn, not a second button that does the same thing.
 */
export function LuckyBoxCard({
  box,
  badge,
  footerNote,
  pricing,
  onSelect,
}: {
  box: LuckyBoxDefinition;
  /** Group-B urgency, same slots as `StoreItemCard`'s: corner badge, note above the price, struck fake list price. */
  badge?: ReactNode;
  footerNote?: ReactNode;
  pricing?: { list: number; sale: number };
  onSelect: () => void;
}) {
  return (
    <div className="group relative flex h-full w-full flex-col overflow-hidden rounded-card border-[1.5px] border-border-track bg-surface">
      <div className="relative flex h-[120px] items-center justify-center bg-input">
        <BoxArt height={62} />
        {/* The item count is what tells the four apart at a glance, so it is
            drawn on the art, not only in the sub line. */}
        <span className="absolute top-2 left-2 rounded-pill bg-amber-tint px-[7px] py-[2px] text-[10px] font-extrabold text-amber-text">
          ×{box.itemCount}
        </span>
        {/* Urgency keeps the top-right corner, as on the item cards; the item
            count moves left rather than stacking under it. */}
        {badge ? (
          <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
            {badge}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border-track px-[11px] pt-[9px]">
        <p className="truncate text-[12.5px] font-extrabold">{box.name}</p>
        <p className="text-[10px] text-ink-faint">
          {itemCountLabel(box.itemCount)} · shiny 1 in {box.shinyOneIn}
        </p>
      </div>

      <div className="mt-auto px-[11px] pt-[8px] pb-[10px]">
        {footerNote}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-[4px]">
            <Coin size={12} />
            <span className="flex items-baseline gap-[5px]">
              {pricing ? (
                <span className="text-[10px] font-bold text-ink-disabled line-through">
                  {pricing.list.toLocaleString("en-US")}
                </span>
              ) : null}
              <span className="text-[12px] font-extrabold text-amber-text">
                {box.coinPrice.toLocaleString("en-US")}
              </span>
            </span>
          </span>
          <span
            aria-hidden
            className="flex size-[28px] flex-none items-center justify-center rounded-[9px] bg-terracotta text-[16px] leading-none text-white transition-colors duration-120 group-hover:bg-terracotta-hover"
          >
            +
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-label={`${box.name}, ${itemCountLabel(box.itemCount)}, ${box.coinPrice} coins`}
        className="absolute inset-0 rounded-card"
      />
    </div>
  );
}

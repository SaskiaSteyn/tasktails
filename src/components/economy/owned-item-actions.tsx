"use client";

import { Coins, PackageMinus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SellConfirm } from "@/components/economy/sell-confirm";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

/**
 * Long-press (or right-click) an owned animal, accessory or decoration to
 * sell it — and, for something currently worn, to take it off — without
 * walking to `/profile/sell` first. User request: the actions live where the
 * thing itself is, on `/zoo`'s gallery cards and the customize screen's
 * grid tiles.
 *
 * Wraps its child rather than replacing it, so both callers keep the exact
 * tile/card they already render (and `ZooGalleryCard` stays a server
 * component — only this wrapper is client-side).
 *
 * Two dialogs, not one: the press opens a menu of what you *could* do, and
 * picking an action opens a confirm. Selling is one-way and the gesture that
 * got here is easy to trigger by accident, so nothing fires without a
 * second, named tap.
 *
 * The sell itself — confirm and request — is `SellConfirm`, shared with the
 * store card's Sell button so the two can't word or behave differently.
 *
 * Unequip is the caller's own call (`onUnequip`) rather than a fetch here:
 * `PetCustomizer` already owns that request, its optimistic per-category
 * equipped ids and its achievement/level-up queues, and none of that should
 * be duplicated.
 */

/** How long a press has to be held before it counts. 500ms is the platform's own long-press timing on both Android and iOS. */
const LONG_PRESS_MS = 500;

export function OwnedItemActions({
  id,
  name,
  sellValue,
  equipped = false,
  onUnequip,
  onSold,
  className,
  children,
}: {
  /** An `InventoryItem` id or a `Pet` id — the sell route resolves either. */
  id: string;
  name: string;
  /** `sellValueOf(coinPrice)`, so the confirm names the payout before it happens. */
  sellValue: number;
  /** Accessory/decoration currently on this pet — adds the "Take off" action. */
  equipped?: boolean;
  onUnequip?: () => void;
  /** Fired after a successful sell, before `router.refresh()` — for callers holding local state about the item that just vanished. */
  onSold?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A long press ends in a `click` on whatever was held (the gallery card's
  // link, the customize tile's equip button). Swallowing exactly that one
  // click is what stops the press from also navigating or equipping.
  const swallowClick = useRef(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState<"sell" | "unequip" | null>(null);

  useEffect(() => {
    const dialog = menuRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function cancelPress() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function startPress(event: React.PointerEvent) {
    // Left button / touch / pen only — a right-click has its own handler
    // below and must not also arm the timer.
    if (event.button !== 0) return;
    cancelPress();
    timer.current = setTimeout(() => {
      swallowClick.current = true;
      setMenuOpen(true);
    }, LONG_PRESS_MS);
  }

  return (
    <div
      className={cn("relative", className)}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      // Desktop's equivalent gesture, free: the same menu on right-click.
      // Also what suppresses the browser's own long-press menu on touch.
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuOpen(true);
      }}
      onClickCapture={(event) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {children}

      {/* The action menu. Same `<dialog>` chrome as `Modal` — platform focus
          trap, Escape and scrim tap both meaning cancel — but a list of
          choices rather than a single confirm, so it isn't `Modal` itself. */}
      <dialog
        ref={menuRef}
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target === menuRef.current) setMenuOpen(false);
        }}
        aria-label={`Actions for ${name}`}
        className="m-auto w-[calc(100%-2.5rem)] max-w-[300px] bg-transparent p-0 text-ink backdrop:bg-scrim"
      >
        <div className="rounded-modal bg-surface p-[14px] shadow-modal">
          <p className="mb-3 truncate px-1 text-center font-display text-[16px] font-semibold">
            {name}
          </p>
          <div className="flex flex-col gap-[9px]">
            {equipped && onUnequip ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirming("unequip");
                }}
                className="flex items-center gap-2.5 rounded-input border border-border-input px-3 py-[11px] text-[13.5px] font-bold transition-colors duration-120 hover:border-checkbox"
              >
                <PackageMinus size={17} strokeWidth={2.2} aria-hidden />
                Take off
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirming("sell");
              }}
              className="flex items-center gap-2.5 rounded-input border border-border-input px-3 py-[11px] text-left text-[13.5px] font-bold text-urgency-text transition-colors duration-120 hover:border-checkbox"
            >
              <Coins size={17} strokeWidth={2.2} aria-hidden />
              Sell for {sellValue.toLocaleString("en-US")} coins
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-input px-3 py-[9px] text-[13px] font-bold text-ink-soft transition-colors duration-120 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      </dialog>

      <Modal
        open={confirming === "unequip"}
        icon={PackageMinus}
        title={`Take off ${name}?`}
        body={`${name} goes back to your things — you can put it on again any time.`}
        confirmLabel="Take off"
        cancelLabel="Leave it on"
        onConfirm={() => {
          setConfirming(null);
          onUnequip?.();
        }}
        onCancel={() => setConfirming(null)}
      />

      <SellConfirm
        open={confirming === "sell"}
        id={id}
        name={name}
        sellValue={sellValue}
        onSold={onSold}
        onClose={() => setConfirming(null)}
      />
    </div>
  );
}

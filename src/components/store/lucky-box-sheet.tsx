"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useCartCount } from "@/components/store/cart-count-context";
import { BoxArt } from "@/components/store/lucky-box-card";
import { Button } from "@/components/ui/button";
import { Coin } from "@/components/ui/coin";
import type { StoreItemRarity } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import {
  itemCountLabel,
  type LuckyBoxDefinition,
  RARITY_ODDS,
} from "@/lib/lucky-boxes";
import { rarityLabel } from "@/lib/rarity";
import {
  SHEET_GRAB_CLASS,
  SHEET_SCROLL_CLASS,
  useSwipeToDismiss,
} from "@/lib/swipe-to-dismiss";

/** Dot and bar colour per tier, as the board draws the odds rows. */
const TIER_INK: Record<StoreItemRarity, string> = {
  COMMON: "bg-checkbox",
  RARE: "bg-sage",
  EPIC: "bg-violet",
  LEGENDARY: "bg-amber",
};

/**
 * Box detail · confirm buy (1b). The only place the odds are published, and
 * the buy confirmation itself — there is no second step. Hard pity stays
 * invisible: nothing here mentions it.
 *
 * Built the way `FeedSheet` is (native `<dialog>`, swipe to dismiss, the grab
 * handle as a close button), so the two sheets behave alike.
 */
export function LuckyBoxSheet({
  box,
  coins,
  onClose,
}: {
  box: LuckyBoxDefinition | null;
  coins: number;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const { swipeProps } = useSwipeToDismiss(onClose);
  const router = useRouter();
  const cart = useCartCount();
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string>();

  // Held through the close so the sheet doesn't empty itself mid-dismiss.
  const [shown, setShown] = useState(box);
  if (box && box !== shown) {
    setShown(box);
    setError(undefined);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (box && !dialog.open) {
      dialog.showModal();
      headingRef.current?.focus();
    }
    if (!box && dialog.open) dialog.close();
  }, [box]);

  const shortfall = shown ? shown.coinPrice - coins : 0;

  /** `origin` is the pressed button — where the fly-to-My-boxes mark leaves from. */
  async function buy(origin: HTMLElement) {
    if (!shown) return;
    setBuying(true);
    setError(undefined);
    try {
      const response = await fetch("/api/gacha/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: shown.key }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Something went wrong.");
        return;
      }
      // Before the close: the button has to still be on screen to measure.
      cart?.announceAdded(shown.name, origin, "boxes");
      onClose();
      // Re-reads the coin balance and the header's unopened count.
      router.refresh();
    } catch {
      setError("Couldn't reach TaskTails. Try again.");
    } finally {
      setBuying(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby={headingId}
      className={cn(
        "max-h-[85vh] bg-transparent p-0 text-ink backdrop:bg-scrim",
        "fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-[26px]",
        "frame:inset-0 frame:m-auto frame:h-fit frame:w-[calc(100%-2.5rem)] frame:max-w-app frame:rounded-[26px]",
      )}
    >
      <div
        {...swipeProps}
        className={cn(
          "flex max-h-[85vh] flex-col overflow-hidden rounded-t-[26px] bg-surface pb-[env(safe-area-inset-bottom)] shadow-modal frame:rounded-[26px]",
          swipeProps.className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn("group w-full flex-none py-3", SHEET_GRAB_CLASS)}
        >
          <span className="mx-auto block h-[5px] w-10 rounded-[3px] bg-step-idle transition-colors duration-120 group-hover:bg-checkbox" />
        </button>

        {shown ? (
          <div
            data-sheet-scroll
            className={cn(
              "flex flex-col gap-[14px] overflow-y-auto px-[18px] pb-5",
              SHEET_SCROLL_CLASS,
            )}
          >
            <div className="flex items-center gap-[13px]">
              <span className="flex size-16 flex-none items-center justify-center rounded-[16px] bg-amber-tint">
                <BoxArt height={39} />
              </span>
              <div className="flex flex-col gap-[3px]">
                <h2
                  id={headingId}
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-[20px] font-semibold outline-none"
                >
                  {shown.name}
                </h2>
                <p className="text-[12px] font-bold text-ink-soft">
                  {itemCountLabel(shown.itemCount)}, one card at a time
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-extrabold tracking-[.6px] text-ink-faint uppercase">
                Chance per item
              </p>
              <ul className="flex flex-col gap-[6px]">
                {(Object.keys(RARITY_ODDS) as StoreItemRarity[]).map(
                  (rarity) => {
                    const percent = Math.round(RARITY_ODDS[rarity] * 100);
                    return (
                      <li key={rarity} className="flex items-center gap-[9px]">
                        <span
                          aria-hidden
                          className={cn(
                            "size-[10px] flex-none rounded-full",
                            TIER_INK[rarity],
                          )}
                        />
                        <span className="text-[12.5px] font-bold text-ink-soft">
                          {rarityLabel(rarity)}
                        </span>
                        <span
                          aria-hidden
                          className="h-[6px] flex-1 overflow-hidden rounded-full bg-input"
                        >
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              TIER_INK[rarity],
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                        <span className="w-[34px] text-right text-[12px] font-extrabold">
                          {percent}%
                        </span>
                      </li>
                    );
                  },
                )}
              </ul>
            </div>

            <p className="rounded-[12px] border border-border-track bg-warm px-3 py-[10px] text-[12px] font-bold text-ink-soft">
              Any card can come back <b>shiny</b> — 1 in {shown.shinyOneIn} from
              this box. Shiny only ever comes from boxes.
            </p>

            <div className="flex flex-col gap-[9px]">
              {error ? (
                <p
                  role="alert"
                  className="text-center text-[11.5px] font-bold text-urgency-text"
                >
                  {error}
                </p>
              ) : null}
              <Button
                size="hero"
                onClick={(event) => buy(event.currentTarget)}
                disabled={buying || shortfall > 0}
              >
                {shortfall > 0 ? (
                  "Not enough coins"
                ) : (
                  <>
                    Buy · <Coin size={15} />
                    {shown.coinPrice.toLocaleString("en-US")}
                  </>
                )}
              </Button>
              {/* "You are not opening it yet" — the buy/open contract. */}
              <p className="text-center text-[11px] font-bold text-ink-faint">
                {shortfall > 0
                  ? `You need ${shortfall.toLocaleString("en-US")} more coins`
                  : `Balance after: ${(coins - shown.coinPrice).toLocaleString("en-US")} coins · opens from My boxes`}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

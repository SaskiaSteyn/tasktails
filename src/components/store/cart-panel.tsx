"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CATEGORY_LABEL, ItemWell } from "@/components/store/item-visual";
import { Button, buttonClasses } from "@/components/ui/button";
import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";
import type { CartItemWithStoreItem } from "@/lib/cart";
import type { PurchasedLine } from "@/lib/checkout";

/** What a successful `POST /api/store/checkout` leaves this screen holding. */
type Confirmation = {
  spent: number;
  purchased: PurchasedLine[];
  coins: number;
  adoptedCount: number;
};

/**
 * STOR-06/07 — the cart panel: lists cart lines, a subtotal/balance summary,
 * a real quantity stepper (STOR-14's `PATCH`, STOR-15's `DELETE`), and now
 * (STOR-07) a real checkout against STOR-16's `POST /api/store/checkout`.
 *
 * Client component holding the cart as local state, seeded once from the
 * server (`cartForUser()`, read by `CartPage`) — every stepper tap updates
 * this local array from the mutation's own response rather than
 * `router.refresh()`-ing the whole page, since a quantity edit doesn't touch
 * anything else this page renders.
 *
 * The "−" button removes the line entirely once quantity would drop to 0
 * (calling `DELETE`, not `PATCH` with a 0) — the mock's stepper has no
 * separate trash icon, and "decrement to nothing removes it" is the reading
 * that satisfies STOR-06's own "item removal" wording without inventing a
 * control the design doesn't show.
 *
 * **The confirmation screen has no design spec** — `design_handoff/` never
 * draws a post-checkout state, only the cart itself. Same situation STOR-05's
 * add-to-cart feedback was in: designed from scratch, kept close to the
 * existing "Cart's empty" empty-state's own visual language (icon tile,
 * Fredoka heading, muted line, outlined secondary button) so it reads as
 * part of the same screen family rather than a one-off. Shows what was
 * bought, coins spent, and the new balance — the three things STOR-07's own
 * wording ("confirms purchase, deducts coins, shows confirmation") asks for
 * — plus a link into the zoo when an animal was among the purchases, since
 * "go see it" is the obvious next step and `pets.length` is already on the
 * response.
 */
export function CartPanel({
  initialCart,
  coins,
}: {
  initialCart: CartItemWithStoreItem[];
  coins: number;
}) {
  const [cart, setCart] = useState(initialCart);
  // Which line has a request in flight, so its own stepper disables without
  // freezing every other row.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string>();
  const [confirmation, setConfirmation] = useState<Confirmation>();

  const subtotal = cart.reduce(
    (sum, line) => sum + line.storeItem.coinPrice * line.quantity,
    0,
  );
  const balanceAfter = coins - subtotal;

  async function handleCheckout() {
    if (checkingOut) return;
    setCheckingOut(true);
    setCheckoutError(undefined);
    try {
      const response = await fetch("/api/store/checkout", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setCheckoutError(body.error ?? "Couldn't check out. Try again.");
        return;
      }
      setConfirmation({
        spent: body.spent,
        purchased: body.purchased,
        coins: body.economy.coins,
        adoptedCount: body.pets.length,
      });
      setCart([]);
    } catch {
      setCheckoutError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  async function setQuantity(line: CartItemWithStoreItem, quantity: number) {
    if (pendingId) return;
    setPendingId(line.id);
    try {
      if (quantity < 1) {
        const response = await fetch(`/api/store/cart/${line.id}`, { method: "DELETE" });
        if (response.ok) {
          setCart((current) => current.filter((c) => c.id !== line.id));
        }
        return;
      }

      const response = await fetch(`/api/store/cart/${line.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (response.ok) {
        const { cartItem } = await response.json();
        setCart((current) => current.map((c) => (c.id === line.id ? cartItem : c)));
      }
    } finally {
      setPendingId(null);
    }
  }

  if (confirmation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          aria-hidden
          className="mb-4 flex size-16 items-center justify-center rounded-card-lg bg-sage-tint"
        >
          <Check size={28} strokeWidth={2.2} className="text-sage" />
        </div>
        <p className="font-display text-[17px] font-semibold">Purchase complete!</p>
        <p className="mt-[6px] text-[12.5px] text-ink-soft">
          {confirmation.purchased.map((line) => `${line.name}${line.quantity > 1 ? ` ×${line.quantity}` : ""}`).join(", ")}
        </p>
        <p className="mt-3 flex items-center gap-1 text-[13px] font-extrabold text-amber-text">
          <Coin size={13} />
          {confirmation.spent.toLocaleString("en-US")} spent · {confirmation.coins.toLocaleString("en-US")} left
        </p>
        <div className="mt-[18px] flex w-full flex-col gap-[10px]">
          {confirmation.adoptedCount > 0 ? (
            <Link href="/zoo" className={buttonClasses({ size: "inline" })}>
              Go see your zoo
            </Link>
          ) : null}
          <Link
            href="/store"
            className={buttonClasses({
              variant: "secondary",
              size: "inline",
            })}
          >
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          aria-hidden
          className="mb-4 flex size-16 items-center justify-center rounded-card-lg border-2 border-dashed border-checkbox bg-input"
        >
          <ShoppingBag size={26} strokeWidth={1.8} className="text-ink-faint" />
        </div>
        <p className="font-display text-[17px] font-semibold">Cart&rsquo;s empty</p>
        <p className="mt-[6px] mb-[18px] text-[12.5px] text-ink-soft">
          Browse the store to treat your pets.
        </p>
        <Link
          href="/store"
          className={buttonClasses({
            variant: "secondary",
            fullWidth: false,
            size: "inline",
            // The mock draws this button hugging its label ("padding 0
            // 20px"), not spanning the frame — `fullWidth={false}` alone
            // doesn't add horizontal padding (nothing's baked into the size
            // preset for it), same gap `not-found.tsx`'s own "Back to
            // tasks" button had to close the same way.
            className: "px-5",
          })}
        >
          Go to store
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        <div className="flex flex-col gap-[10px]">
          {cart.map((line) => (
            <div
              key={line.id}
              className="flex items-center gap-[11px] rounded-[14px] border border-border-track bg-warm p-[10px]"
            >
              <ItemWell item={line.storeItem} size={44} iconSize={20} animalIconSize={32} rounded="rounded-[10px]" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-extrabold">{line.storeItem.name}</p>
                <p className="text-[11px] text-ink-faint">{CATEGORY_LABEL[line.storeItem.category]}</p>
              </div>

              <div className="flex flex-none items-center gap-[6px]">
                <button
                  type="button"
                  onClick={() => setQuantity(line, line.quantity - 1)}
                  disabled={pendingId === line.id}
                  aria-label={
                    line.quantity === 1
                      ? `Remove ${line.storeItem.name} from cart`
                      : `Decrease ${line.storeItem.name} quantity`
                  }
                  className="flex size-[22px] items-center justify-center rounded-[6px] border border-border-input bg-surface text-ink-soft transition-colors duration-120 hover:border-checkbox disabled:opacity-50"
                >
                  <Minus size={14} strokeWidth={2.4} aria-hidden />
                </button>
                <span className="w-[18px] text-center text-[13px] font-extrabold">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(line, line.quantity + 1)}
                  disabled={pendingId === line.id}
                  aria-label={`Increase ${line.storeItem.name} quantity`}
                  className="flex size-[22px] items-center justify-center rounded-[6px] border border-border-input bg-surface text-ink-soft transition-colors duration-120 hover:border-checkbox disabled:opacity-50"
                >
                  <Plus size={14} strokeWidth={2.4} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[18px] rounded-[14px] border border-border-track bg-warm p-[14px]">
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="text-ink-soft">Subtotal</span>
            <span className="flex items-center gap-1 font-extrabold text-amber-text">
              <Coin size={12} />
              {subtotal.toLocaleString("en-US")}
            </span>
          </div>
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="text-ink-soft">Balance now</span>
            <span className="font-bold">{coins.toLocaleString("en-US")}</span>
          </div>
          <div className="my-2 h-px bg-border-input" />
          <div className="flex justify-between text-[13px]">
            <span className="font-extrabold">Balance after</span>
            <span
              className={cn(
                "font-extrabold",
                balanceAfter >= 0 ? "text-sage" : "text-urgency",
              )}
            >
              {balanceAfter.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-none border-t border-border-track p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        {checkoutError ? (
          <p role="alert" className="mb-2 text-center text-[12px] font-bold text-urgency-text">
            {checkoutError}
          </p>
        ) : null}
        <Button onClick={handleCheckout} disabled={checkingOut} className="gap-[7px]">
          {checkingOut ? (
            "Checking out…"
          ) : (
            <>
              Check out ·
              <Coin size={14} />
              {subtotal.toLocaleString("en-US")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

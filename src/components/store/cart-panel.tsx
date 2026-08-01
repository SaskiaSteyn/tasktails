"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CATEGORY_LABEL, ItemWell } from "@/components/store/item-visual";
import { buttonClasses } from "@/components/ui/button";
import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";
import type { CartItemWithStoreItem } from "@/lib/cart";

/**
 * STOR-06 — the cart panel: lists cart lines, a subtotal/balance summary,
 * and a real quantity stepper (STOR-14's `PATCH`, STOR-15's `DELETE`).
 *
 * Client component holding the cart as local state, seeded once from the
 * server (`cartForUser()`, read by `CartPage`) — every stepper tap updates
 * this local array from the mutation's own response rather than
 * `router.refresh()`-ing the whole page, since a quantity edit doesn't touch
 * anything else this page renders (no economy change happens until STOR-07's
 * checkout).
 *
 * The "−" button removes the line entirely once quantity would drop to 0
 * (calling `DELETE`, not `PATCH` with a 0) — the mock's stepper has no
 * separate trash icon, and "decrement to nothing removes it" is the reading
 * that satisfies STOR-06's own "item removal" wording without inventing a
 * control the design doesn't show.
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

  const subtotal = cart.reduce(
    (sum, line) => sum + line.storeItem.coinPrice * line.quantity,
    0,
  );
  const balanceAfter = coins - subtotal;

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
        {/* Inert — STOR-07 owns wiring this to POST /api/store/checkout. */}
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-[7px] rounded-btn bg-terracotta font-display text-[16px] font-semibold text-white shadow-btn"
        >
          Check out ·
          <Coin size={14} />
          {subtotal.toLocaleString("en-US")}
        </button>
      </div>
    </div>
  );
}

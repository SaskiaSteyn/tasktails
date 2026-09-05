"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAchievementUnlock } from "@/components/economy/achievement-unlock-provider";
import { useLevelUp } from "@/components/economy/level-up-provider";
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
 * — plus a link into the zoo, since food, accessories and decorations are
 * all spent there too, not just a newly adopted animal.
 *
 * A checkout is one of PRO-09's three achievement-unlock trigger points; any
 * newly unlocked badge goes to `useAchievementUnlock().celebrate()`, same
 * pattern `TaskList`/`SubtaskList` use for theirs.
 *
 * `variant` (INF-22) is the one thing that differs between its two mounts.
 * On `/store/cart` (`"page"`) it becomes the handoff's two-pane checkout from
 * `xl:` up: priced rows on the left, the summary and the checkout button
 * pinned in a 380px panel on the right. In `/store`'s persistent cart rail
 * (`"rail"`) it keeps the phone frame's single narrow column at every width,
 * because a two-pane layout inside a 330px rail is not a layout. Nothing else
 * changes — same state, same requests, same steppers, so a quantity edit or a
 * checkout behaves identically wherever it is mounted.
 *
 * `xl:`, not `desk:`, for the table: the handoff's four columns are 1fr plus
 * 400px of fixed widths, and once the 380px summary panel is beside them the
 * 900px tablet has nothing left for the item names — measured live, the name
 * column collapsed to nothing. The page keeps the phone's single column,
 * centred, in that band instead.
 *
 * The summary block is one `<Summary>` rendered in two places, each hidden at
 * the other width, rather than two copies of the markup: on a phone it scrolls
 * with the list exactly as the mobile frame draws it, and on desktop it is
 * pinned in the side panel exactly as the desktop frame draws it. There is no
 * single DOM position that is both.
 */
export function CartPanel({
  initialCart,
  coins,
  variant = "page",
}: {
  initialCart: CartItemWithStoreItem[];
  coins: number;
  /** `"rail"` keeps the narrow single-column layout at every width. */
  variant?: "page" | "rail";
}) {
  const { celebrate: celebrateAchievements } = useAchievementUnlock();
  const { celebrate: celebrateLevelUp } = useLevelUp();
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
  // Only the full-page mount widens; see the `variant` note above.
  const wide = variant === "page";

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
      });
      setCart([]);
      celebrateAchievements(body.achievementsUnlocked);
      // PRO-18 — a purchase itself grants no XP, but an achievement it
      // unlocks (e.g. "own every accessory") can.
      celebrateLevelUp(body.levelUp);
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
          <Link href="/zoo" className={buttonClasses({ size: "inline" })}>
            Go see your zoo
          </Link>
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
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        wide && "xl:flex-row xl:gap-7 xl:px-[34px] xl:py-[30px]",
      )}
    >
      <div
        className={cn(
          "flex-1 overflow-y-auto px-4 pt-4",
          wide && "xl:min-w-0 xl:px-0 xl:pt-0",
        )}
      >
        {/* Column headings, desktop only. The narrow rows (phone cart + the
            `/store` rail) carry a single line-total to the right of the
            stepper instead (#209) — one value, not a labelled Unit/Total
            pair, so it needs no header. */}
        {wide ? (
          <div className="mb-2 hidden grid-cols-[1fr_130px_150px_120px] gap-4 border-b border-border-track px-5 pb-3 text-overline xl:grid">
            <span>Item</span>
            <span className="text-right">Unit</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Total</span>
          </div>
        ) : null}

        <div className={cn("flex flex-col gap-[10px]", wide && "xl:gap-0")}>
          {cart.map((line) => (
            <div
              key={line.id}
              className={cn(
                "flex items-center gap-[11px] rounded-[14px] border border-border-track bg-warm p-[10px]",
                wide &&
                  "xl:grid xl:grid-cols-[1fr_130px_150px_120px] xl:gap-4 xl:rounded-none xl:border-x-0 xl:border-t-0 xl:bg-transparent xl:px-5 xl:py-4",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-[11px] xl:flex-none">
                <ItemWell
                  item={line.storeItem}
                  size={44}
                  iconSize={20}
                  animalIconSize={32}
                  rounded="rounded-[10px]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold">{line.storeItem.name}</p>
                  <p className="text-[11px] text-ink-faint">{CATEGORY_LABEL[line.storeItem.category]}</p>
                </div>
              </div>

              {wide ? (
                <span className="hidden items-center justify-end gap-1 text-[13px] font-bold text-amber-text xl:flex">
                  <Coin size={12} />
                  {line.storeItem.coinPrice.toLocaleString("en-US")}
                </span>
              ) : null}

              <div className="flex flex-none items-center gap-[6px] xl:justify-center">
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

              {/* #209 — line total (unit × qty) at the right edge of the narrow
                  row, where the mock left the row priceless. Hidden at `xl`,
                  where the wide grid's own Unit/Total columns take over.
                  `pr-[4px]` lines its right edge up with the summary card's
                  Subtotal value below: the row is `p-[10px]`, the summary card
                  `p-[14px]`, and both span the same width, so this closes the
                  4px gap. */}
              <span
                aria-label={`${(line.storeItem.coinPrice * line.quantity).toLocaleString("en-US")} coins`}
                className="flex flex-none items-center gap-1 pr-[4px] text-[13px] font-extrabold text-amber-text xl:hidden"
              >
                <Coin size={12} />
                {(line.storeItem.coinPrice * line.quantity).toLocaleString("en-US")}
              </span>

              {wide ? (
                <span className="hidden items-center justify-end gap-1 font-display text-[15px] font-semibold text-amber-text xl:flex">
                  <Coin size={13} />
                  {(line.storeItem.coinPrice * line.quantity).toLocaleString("en-US")}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <Summary
          subtotal={subtotal}
          coins={coins}
          balanceAfter={balanceAfter}
          className={cn("mt-[18px]", wide && "xl:hidden")}
        />
      </div>

      <div
        className={cn(
          "flex-none border-t border-border-track p-4 pb-[calc(16px+env(safe-area-inset-bottom))]",
          wide &&
            "xl:flex xl:w-[380px] xl:flex-col xl:gap-4 xl:rounded-card-lg xl:border xl:bg-warm xl:p-5 xl:pb-5",
        )}
      >
        {wide ? (
          <Summary
            subtotal={subtotal}
            coins={coins}
            balanceAfter={balanceAfter}
            className="hidden border-none bg-transparent p-0 xl:block"
          />
        ) : null}
        {checkoutError ? (
          <p role="alert" className="mb-2 text-center text-[12px] font-bold text-urgency-text">
            {checkoutError}
          </p>
        ) : null}
        <Button
          onClick={handleCheckout}
          disabled={checkingOut}
          className={cn("gap-[7px]", wide && "xl:mt-auto")}
        >
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

/**
 * Subtotal / balance now / balance after — one definition, mounted twice (in
 * the scrolling list on a phone, in the pinned side panel on desktop), which
 * is why it takes its numbers as props rather than closing over them.
 */
function Summary({
  subtotal,
  coins,
  balanceAfter,
  className,
}: {
  subtotal: number;
  coins: number;
  balanceAfter: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-border-track bg-warm p-[14px]",
        className,
      )}
    >
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
  );
}

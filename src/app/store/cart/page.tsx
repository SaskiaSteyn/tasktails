import { ChevronLeft, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { CartPanel } from "@/components/store/cart-panel";
import { cartForUser } from "@/lib/cart";
import { currentEconomy } from "@/lib/economy";

export const metadata: Metadata = {
  title: "Your cart · TaskTails",
};

/**
 * STOR-06 — the cart screen, per `design_handoff/TaskTails Screens.dc.html`'s
 * "Cart / checkout" frame. A focused flow, not tab content — same "no
 * `BottomNav`" call `EditTaskPage` makes for the same reason, and the mock's
 * own footer is the checkout button, not a nav row.
 *
 * Bespoke header (back chevron + "Your cart"), built the same way
 * `SanctuaryPage`'s is: neither is `PersistentHeader`'s title variant, which
 * always carries a coin pill the mock doesn't draw here. The history icon on
 * the right is **not in the mock** — added at the user's explicit direction
 * as the other half of swapping `/store`'s own history icon for a cart icon,
 * so history is still one tap away, just relocated. Now links to STOR-09's
 * `/store/history`.
 *
 * Only the listing/qty-edit/removal (`CartPanel`) is this ticket's job. The
 * "Check out" footer button renders matching the mock but is inert — STOR-07
 * owns wiring it to the real `POST /api/store/checkout`.
 */
export default async function CartPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [cart, economy] = await Promise.all([cartForUser(userId), currentEconomy()]);

  return (
    <AppShell
      header={
        <header className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] py-[14px]">
          <Link
            href="/store"
            aria-label="Back to store"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-[17px] leading-[1.15] font-semibold">
            Your cart
          </h1>
          <Link
            href="/store/history"
            aria-label="Purchase history"
            className="flex size-[34px] flex-none items-center justify-center rounded-full border border-border-track bg-surface text-ink-soft transition-colors duration-120 hover:border-checkbox"
          >
            <History size={17} strokeWidth={2} aria-hidden />
          </Link>
        </header>
      }
      className="bg-warm"
    >
      <CartPanel initialCart={cart} coins={economy?.coins ?? 0} />
    </AppShell>
  );
}

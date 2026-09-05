import { ChevronLeft } from "lucide-react";
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
 * always carries a coin pill the mock doesn't draw here.
 *
 * The way to STOR-09's `/store/history` used to be an icon-only button in
 * that header (plus a labelled copy of it above the list, for desktop, where
 * the phone header is hidden). Both are gone as of 2026-09-05, at the user's
 * request — "make the purchase history button more clear": `CartPanel` now
 * draws one labelled link instead, under the empty state's "Go to store"
 * button and under the checkout button when the cart has something in it, at
 * every width.
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
        </header>
      }
      className="bg-warm desk:mx-auto desk:w-full desk:max-w-[720px] desk:bg-surface xl:max-w-none"
    >
      <CartPanel initialCart={cart} coins={economy?.coins ?? 0} />
    </AppShell>
  );
}

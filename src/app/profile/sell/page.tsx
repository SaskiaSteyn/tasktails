import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SellItemsList } from "@/components/profile/sell-items-list";
import { sellableItemsForUser } from "@/lib/sell";

export const metadata: Metadata = {
  title: "Sell items · TaskTails",
};

/**
 * GACHA-17 — `/profile/sell`, per the approved design board's "Sell items"
 * frame. Reached from `GACHA-16`'s "Manage" button on Profile, now wired
 * there instead of the inert `<span>` it shipped as.
 *
 * Bespoke header (back chevron + title, no `BottomNav`) — same shape as
 * `PurchaseHistoryPage` (STOR-09), the closest existing precedent for a
 * focused list screen reached from elsewhere rather than tab content.
 *
 * The initial list is read server-side (`sellableItemsForUser()`, `GACHA-08`)
 * the same way `PurchaseHistoryPage` reads `transactionsForUser()` — no
 * client-side fetch-on-mount needed for data that's already known at render
 * time. `SellItemsList` (client) owns everything after that: each row's own
 * sell action and removing it from view on success.
 */
export default async function SellItemsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const items = await sellableItemsForUser(userId);

  return (
    <AppShell
      header={
        <header className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] pt-[calc(6px+env(safe-area-inset-top))] pb-[14px]">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-[17px] leading-[1.15] font-semibold">
            Sell items
          </h1>
        </header>
      }
    >
      <SellItemsList initialItems={items} />
    </AppShell>
  );
}

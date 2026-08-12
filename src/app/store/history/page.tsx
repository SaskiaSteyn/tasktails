import { ChevronLeft, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ItemWell } from "@/components/store/item-visual";
import { buttonClasses } from "@/components/ui/button";
import { transactionsForUser, type TransactionWithStoreItem } from "@/lib/checkout";
import { calendarDaysBetween, isSameDay } from "@/lib/day";

export const metadata: Metadata = {
  title: "Purchase history · TaskTails",
};

/**
 * STOR-09 — the purchase history / transaction log, per
 * `design_handoff/TaskTails Screens.dc.html`'s "Purchase history" frame.
 * Reached from `/store/cart`'s header icon (STOR-06's own placement, per the
 * user's direction when the store header's history icon became a cart
 * icon).
 *
 * Bespoke header, same shape as `CartPage`'s own (back chevron + title, no
 * coin pill, no `BottomNav` — a focused flow, not tab content).
 *
 * Pure server component, no client boundary anywhere in this file — nothing
 * here is interactive, so there's no hydration risk from the day/time
 * formatting below even though locale is pinned anyway (`"en-US"`, matching
 * the `toLocaleString()` convention established for numbers elsewhere).
 *
 * Two deliberate deviations from the mock, both because of what
 * `Transaction` actually stores (STOR-16): no `Bought 40 XP` row — XP
 * purchases (ECO-06) only touch `UserEconomy`, they never write a
 * `Transaction`, and inventing one here would show data that was never
 * recorded. And no `×N` quantity suffix on a line — STOR-16 stores one
 * `Transaction` row per cart *line* with `coinSpent` already totalled, not a
 * quantity column, so a suffix could only be a *derived* guess
 * (`coinSpent / storeItem.coinPrice`) that would read wrong the moment a
 * price changes after the fact (this app has already repriced an item once
 * — see `prisma/seed.ts`'s note on the Koala kit) — not a risk worth taking
 * for a cosmetic suffix.
 */
export default async function PurchaseHistoryPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const transactions = await transactionsForUser(userId);
  const now = new Date();

  const groups = groupByDay(transactions, now);
  const spentThisWeek = transactions
    .filter((t) => calendarDaysBetween(t.purchasedAt, now) < 7)
    .reduce((sum, t) => sum + t.coinSpent, 0);

  return (
    <AppShell
      header={
        <header className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] py-[14px]">
          <Link
            href="/store/cart"
            aria-label="Back to cart"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-[17px] leading-[1.15] font-semibold">
            Purchase history
          </h1>
        </header>
      }
      className="bg-warm"
    >
      {transactions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div
            aria-hidden
            className="mb-4 flex size-16 items-center justify-center rounded-card-lg border-2 border-dashed border-checkbox bg-input"
          >
            <Receipt size={26} strokeWidth={1.8} className="text-ink-faint" />
          </div>
          <p className="font-display text-[17px] font-semibold">No purchases yet</p>
          <p className="mt-[6px] mb-[18px] text-[12.5px] text-ink-soft">
            Buy something and it&rsquo;ll show up here.
          </p>
          <Link
            href="/store"
            className={buttonClasses({
              variant: "secondary",
              fullWidth: false,
              size: "inline",
              className: "px-5",
            })}
          >
            Go to store
          </Link>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 pt-4">
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-[9px] text-[11px] font-extrabold tracking-[0.4px] text-ink-soft">
                  {group.label.toUpperCase()}
                </p>
                <div className="flex flex-col gap-[9px]">
                  {group.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-[11px] py-[2px]">
                      <ItemWell
                        item={entry.storeItem}
                        size={38}
                        iconSize={16}
                        animalIconSize={26}
                        rounded="rounded-[10px]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold">{entry.storeItem.name}</p>
                        <p className="text-[11px] text-ink-faint">
                          {rowTimestamp(entry.purchasedAt, now)}
                        </p>
                      </div>
                      <p className="flex-none text-[13px] font-extrabold text-terracotta">
                        −{entry.coinSpent.toLocaleString("en-US")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-none items-center justify-between border-t border-border-track bg-warm px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <span className="text-[12px] text-ink-soft">Spent this week</span>
            <span className="font-display text-[18px] font-semibold text-amber-text">
              {spentThisWeek.toLocaleString("en-US")} coins
            </span>
          </div>
        </>
      )}
    </AppShell>
  );
}

type DayGroup = { label: string; entries: TransactionWithStoreItem[] };

/** Groups already-newest-first transactions (STOR-17) into day buckets without re-sorting. */
function groupByDay(transactions: TransactionWithStoreItem[], now: Date): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of transactions) {
    const label = dayLabel(entry.purchasedAt, now);
    const current = groups.at(-1);
    if (current?.label === label) {
      current.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  }
  return groups;
}

function dayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return "Today";
  if (calendarDaysBetween(date, now) === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Time-only for today's entries, dated otherwise — matches the mock's own two examples. */
function rowTimestamp(date: Date, now: Date): string {
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (isSameDay(date, now)) return time;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${time}`;
}

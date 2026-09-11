import { ChevronDown, ChevronLeft, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { CATEGORY_LABEL, ItemWell } from "@/components/store/item-visual";
import { RarityChip, rarityThumbFill } from "@/components/store/rarity-chip";
import { buttonClasses } from "@/components/ui/button";
import {
  transactionsForUser,
  type TransactionWithStoreItem,
} from "@/lib/checkout";
import { cn } from "@/lib/cn";
import { calendarDaysBetween, isSameDay } from "@/lib/day";
import { spendByDay, spendByWeek } from "@/lib/spend-breakdown";

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
 * Pure server component, no client boundary anywhere in this file — the only
 * interaction is the per-day accordion (#254), which is a native `<details>`,
 * so there's no hydration risk from the day/time formatting below even though
 * locale is pinned anyway (`"en-US"`, matching the `toLocaleString()`
 * convention established for numbers elsewhere).
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
  // #278 — the footer used to show the last 7 days only, which answered a
  // narrower question than the screen it sits on: this is the *history*,
  // so the headline figure is everything ever spent. The week is still
  // there, one tap down, alongside the rest of the shape.
  const spentAllTime = transactions.reduce((sum, t) => sum + t.coinSpent, 0);
  const weeks = spendByWeek(transactions, now);
  const days = spendByDay(transactions, now);

  return (
    <AppShell
      header={
        <header className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] pt-[calc(14px+env(safe-area-inset-top))] pb-[14px]">
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
      className="bg-warm desk:bg-surface"
    >
      {transactions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div
            aria-hidden
            className="mb-4 flex size-16 items-center justify-center rounded-card-lg border-2 border-dashed border-checkbox bg-input"
          >
            <Receipt size={26} strokeWidth={1.8} className="text-ink-faint" />
          </div>
          <p className="font-display text-[17px] font-semibold">
            No purchases yet
          </p>
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
          <div className="flex-1 overflow-y-auto px-4 pt-4 desk:px-[34px] desk:pt-7">
            {/* Column headings, desktop only — the phone rows stack their
                fields instead of ruling them into columns.

                **No QTY column**, which the desktop mock draws: `Transaction`
                has no quantity — a checkout writes one row per unit — so the
                column would be a hard-coded "1" on every row. Raised rather
                than invented, per the handoff's own rule 4. */}
            <div className="mb-1 hidden grid-cols-[120px_1fr_160px_120px] gap-[18px] border-b border-border-track px-[22px] pb-3 text-overline desk:grid">
              <span>When</span>
              <span>Item</span>
              <span>Category</span>
              <span className="text-right">Cost</span>
            </div>

            {/* One `<details>` per day (#254) — a long unbroken list made the
                dates hard to pick out and the scroll long. Native disclosure
                rather than a toggle component: this page has no client
                boundary anywhere (see the note above), and `<details>` keeps
                it that way, with keyboard and screen-reader semantics for
                free. The newest day opens on load, since it is the one a
                participant just came from the store to check. */}
            {groups.map((group, index) => (
              <details
                key={group.label}
                open={index === 0}
                className="group/day mb-2 desk:mb-0"
              >
                {/* The summary keeps its default `display: list-item` and
                    lays its contents out in a `<div>` instead: Safari has a
                    long-standing quirk where a `<summary>` displayed as
                    anything else stops toggling reliably, and the study runs
                    on iPhones. `list-none` plus the WebKit marker rule hides
                    the triangle without touching `display`. */}
                <summary className="cursor-pointer list-none py-[7px] desk:mt-2 desk:px-[22px] [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-[6px] text-[11px] font-extrabold tracking-[0.4px] text-ink-soft">
                    <ChevronDown
                      size={14}
                      aria-hidden
                      className="flex-none transition-transform duration-120 group-open/day:rotate-180"
                    />
                    <span className="min-w-0 truncate">
                      {group.label.toUpperCase()} ({group.entries.length})
                    </span>
                    {/* The day's spend, so a collapsed row still answers "what
                        did that day cost me" without opening it. */}
                    <span className="ml-auto flex-none font-display text-[12px] text-terracotta">
                      −
                      {group.entries
                        .reduce((sum, entry) => sum + entry.coinSpent, 0)
                        .toLocaleString("en-US")}
                    </span>
                  </div>
                </summary>
                <div className="flex flex-col gap-[9px] pb-2 desk:gap-0 desk:pb-0">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-[11px] py-[2px] desk:grid desk:grid-cols-[120px_1fr_160px_120px] desk:items-center desk:gap-[18px] desk:border-b desk:border-border-track/70 desk:px-[22px] desk:py-[13px] desk:hover:bg-warm"
                    >
                      {/* Drawn twice, hidden at the other width: on a phone the
                          timestamp sits under the name, on desktop it is the
                          first column. No DOM position is both. */}
                      <p className="hidden text-[12.5px] font-bold text-ink-soft desk:block">
                        {rowTimestamp(entry.purchasedAt, now)}
                      </p>
                      <div className="flex min-w-0 flex-1 items-center gap-[11px] desk:flex-none">
                        <ItemWell
                          bgClassNameOverride={rarityThumbFill(
                            entry.storeItem.rarity,
                          )}
                          item={entry.storeItem}
                          size={38}
                          iconSize={16}
                          animalIconSize={26}
                          rounded="rounded-[10px]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[13px] font-bold">
                              {entry.storeItem.name}
                            </p>
                            {/* #276 §5 — the tier, with no effects: this is a
                                dense historical list, not a shop window. */}
                            <RarityChip
                              rarity={entry.storeItem.rarity}
                              size="row"
                            />
                          </div>
                          <p className="text-[11px] text-ink-faint desk:hidden">
                            {rowTimestamp(entry.purchasedAt, now)}
                          </p>
                        </div>
                      </div>
                      <p className="hidden text-[12.5px] font-bold text-ink-soft desk:block">
                        {CATEGORY_LABEL[entry.storeItem.category]}
                      </p>
                      <p className="flex-none text-[13px] font-extrabold text-terracotta desk:text-right">
                        −{entry.coinSpent.toLocaleString("en-US")}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>

          {/* A native `<details>`, like the per-day accordion above it — the
              breakdown costs this page no client boundary and still works
              with JavaScript off. `group` drives the chevron; `open:` is
              what lets the summary's own border appear only once expanded. */}
          <details className="group flex-none border-t border-border-track bg-warm">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 desk:px-[34px] desk:py-4 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-[6px] text-[12px] text-ink-soft">
                Total spent
                <ChevronDown
                  size={14}
                  strokeWidth={2.4}
                  aria-hidden
                  className="transition-transform duration-120 group-open:rotate-180"
                />
              </span>
              <span className="font-display text-[18px] font-semibold text-amber-text">
                {spentAllTime.toLocaleString("en-US")} coins
              </span>
            </summary>

            <div className="border-t border-border-track px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] desk:px-[34px] desk:pb-4">
              <SpendSection title="By week" buckets={weeks} />
              {/* The span is named rather than left implicit: every purchase
                  is already listed day by day up the page, so this is the
                  recent shape at a glance, not a second copy of the log. */}
              <SpendSection
                title="Last 7 days"
                buckets={days}
                className="mt-[14px]"
              />
            </div>
          </details>
        </>
      )}
    </AppShell>
  );
}

/** #278 — one labelled list of spend buckets inside the footer's breakdown. */
function SpendSection({
  title,
  buckets,
  className,
}: {
  title: string;
  buckets: { label: string; coins: number }[];
  className?: string;
}) {
  if (buckets.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-overline mb-[6px]">{title}</p>
      <dl className="flex flex-col gap-[5px]">
        {buckets.map((bucket) => (
          <div
            key={bucket.label}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="text-[12px] text-ink-soft">{bucket.label}</dt>
            {/* A zero day is greyed rather than hidden — see `spendByDay`. */}
            <dd
              className={cn(
                "text-[12.5px] font-extrabold",
                bucket.coins > 0 ? "text-amber-text" : "text-ink-faint",
              )}
            >
              {bucket.coins.toLocaleString("en-US")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type DayGroup = { label: string; entries: TransactionWithStoreItem[] };

/** Groups already-newest-first transactions (STOR-17) into day buckets without re-sorting. */
function groupByDay(
  transactions: TransactionWithStoreItem[],
  now: Date,
): DayGroup[] {
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

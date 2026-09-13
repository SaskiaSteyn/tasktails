import { ChevronLeft, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { BoxArt } from "@/components/store/lucky-box-card";
import { buttonClasses } from "@/components/ui/button";
import { CoinPill } from "@/components/ui/coin";
import { calendarDaysBetween } from "@/lib/day";
import { currentEconomy } from "@/lib/economy";
import { waitingLuckyBoxesForUser } from "@/lib/gacha";
import { itemCountLabel, luckyBox } from "@/lib/lucky-boxes";

export const metadata: Metadata = {
  title: "My boxes · TaskTails",
};

/** "bought today" / "opened yesterday" / "bought 18 Aug" — server time, the study's timezone (`day.ts`). */
function dayLabel(verb: string, date: Date, now: Date): string {
  const days = calendarDaysBetween(date, now);
  if (days === 0) return `${verb} today`;
  if (days === 1) return `${verb} yesterday`;
  return `${verb} ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

/**
 * My boxes (`design_handoff_lucky_boxes` 1c, 1d) — every box not yet fully
 * revealed, reached from the store header's box button. Unopened duplicates
 * stack into one row with a count, newest first; Open opens the newest of
 * them. A box opened but left mid-reveal gets its own Continue row, listed
 * first, since it is the thing already in progress.
 *
 * Copy and the footnote follow the board (refreshed after the README, which
 * still says "UNOPENED · 4" and "No boxes waiting").
 */
export default async function MyBoxesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [boxes, economy] = await Promise.all([
    waitingLuckyBoxesForUser(userId),
    currentEconomy(),
  ]);

  // Newest first already, so the first box of each key sets its row's place.
  // Unfinished reveals never stack: each has its own haul to go back to.
  const rows = new Map<
    string,
    { newest: (typeof boxes)[number]; count: number }
  >();
  for (const box of [...boxes].sort(
    (a, b) => Number(b.openedAt !== null) - Number(a.openedAt !== null),
  )) {
    const key = box.openedAt ? box.id : box.boxKey;
    const row = rows.get(key);
    if (row) row.count++;
    else rows.set(key, { newest: box, count: 1 });
  }
  const now = new Date();

  return (
    <AppShell
      header={
        <header className="flex flex-none items-center gap-[10px] border-b border-border-track bg-warm px-[18px] pt-[calc(6px+env(safe-area-inset-top))] pb-[14px]">
          <Link
            href="/store"
            aria-label="Back to store"
            className="flex size-[34px] flex-none items-center justify-center rounded-full border border-border-track bg-surface text-ink-soft transition-colors duration-120 hover:border-checkbox"
          >
            <ChevronLeft size={17} strokeWidth={2.2} aria-hidden />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-[19px] leading-[1.15] font-semibold">
            My boxes
          </h1>
          <CoinPill coins={economy?.coins ?? 0} />
        </header>
      }
      nav={<BottomNav />}
      className="px-[18px] pt-[14px] pb-4 desk:mx-auto desk:w-full desk:max-w-[640px] desk:py-8"
    >
      {rows.size === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-[14px] px-[22px] text-center">
          <span className="flex size-24 items-center justify-center rounded-[24px] bg-[#E9E3D9]">
            {/* Muted: an empty shelf, not a box you already own. */}
            <BoxArt height={56} className="opacity-45 grayscale" />
          </span>
          <h2 className="font-display text-[19px] font-semibold">
            No boxes yet
          </h2>
          <p className="text-[12.5px] leading-[1.5] font-bold text-ink-soft">
            Buy one in the Store and it waits here until you want to open it.
            Boxes are the only place shiny items come from.
          </p>
          <Link
            href="/store?category=BOXES"
            className={buttonClasses({
              variant: "secondary",
              size: "inline",
              fullWidth: false,
              className: "mt-[2px]",
            })}
          >
            Browse boxes
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-[11px]">
          <p className="text-[12px] font-bold text-ink-soft">
            {boxes.length} {boxes.length === 1 ? "box" : "boxes"} waiting.
            Nothing expires.
          </p>

          <ul className="flex flex-col gap-[11px]">
            {[...rows.entries()].map(([key, { newest, count }]) => {
              const box = luckyBox(newest.boxKey);
              const resuming = newest.openedAt !== null;
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 rounded-card border border-border-track bg-surface p-3"
                >
                  <span className="flex size-[52px] flex-none items-center justify-center rounded-[13px] bg-amber-tint">
                    <BoxArt height={32} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-[3px]">
                    <p className="flex items-center gap-[6px] text-[13.5px] font-extrabold">
                      <span className="truncate">{box.name}</span>
                      {count > 1 ? (
                        <span className="flex-none rounded-pill bg-amber-tint px-[7px] py-[2px] text-[10px] font-extrabold text-amber-text">
                          ×{count}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] font-bold text-ink-faint">
                      {itemCountLabel(box.itemCount)} ·{" "}
                      {resuming
                        ? dayLabel("opened", newest.openedAt!, now)
                        : dayLabel("bought", newest.purchasedAt, now)}
                    </p>
                  </div>
                  <Link
                    href={`/store/boxes/${newest.id}`}
                    aria-label={`${resuming ? "Continue" : "Open"} ${box.name}`}
                    className="ml-auto flex h-9 flex-none items-center rounded-[11px] bg-terracotta px-[18px] font-display text-[13.5px] font-semibold text-white shadow-[0_4px_10px_rgb(226_122_84/0.3)] transition-colors duration-120 hover:bg-terracotta-hover"
                  >
                    {resuming ? "Continue" : "Open"}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mt-[2px] flex items-center gap-[10px] rounded-input bg-warm px-[13px] py-[11px] text-[11.5px] leading-[1.45] font-bold text-ink-soft">
            <Info
              size={16}
              strokeWidth={2}
              aria-hidden
              className="flex-none text-ink-faint"
            />
            Animals go straight to your zoo; everything else stacks in your
            inventory.
          </p>
        </div>
      )}
    </AppShell>
  );
}

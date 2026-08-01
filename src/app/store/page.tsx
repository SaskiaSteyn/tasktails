import { History, Search } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PersistentHeader } from "@/components/layout/persistent-header";
import { StoreItemCard } from "@/components/store/store-item-card";
import { storeItemsForUser } from "@/lib/store";

export const metadata: Metadata = {
  title: "Store · TaskTails",
};

const CATEGORY_CHIPS = ["All", "Food", "Accessories", "Animals", "Decorations"] as const;

/**
 * STOR-01 — the store listing, per `design_handoff/TaskTails Screens.dc.html`'s
 * "Store — Group A" frame. Replaces the `ComingSoon` placeholder `BottomNav`
 * (SHR-01) has pointed at since it shipped.
 *
 * Only the grid (`StoreItemCard`, `storeItemsForUser()`) is real. The header's
 * history icon, the search field, and the category chips all render matching
 * the mock exactly, but are inert — no filtering, no navigation — since
 * STOR-02 (search), STOR-03 (category filter) and STOR-09 (history page) are
 * separate, unbuilt tickets. Same "render the control, wire it up later"
 * pattern TASK-01 used for its own then-unbuilt "+ New task" pill. The
 * history icon's markup matches the style guide's own "Header — title" sample
 * exactly (`/style-guide`).
 *
 * `PersistentHeader`'s title variant is STOR-08's coin balance display,
 * already shipped by INF-12 — same "done by reuse" relationship TASK-06 had
 * to INF-12's greeting variant.
 *
 * Reads `storeItemsForUser()` directly, same server-component pattern
 * `TasksPage`/`ZooPage` use for their own list reads — no network hop needed
 * since nothing but this page renders it yet (STOR-10 is the network-facing
 * version, for whatever client-side re-fetch STOR-02/03 end up needing).
 */
export default async function StorePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const items = await storeItemsForUser(userId);

  return (
    <AppShell
      header={
        <PersistentHeader
          title="Store"
          action={
            <span
              aria-hidden
              className="flex size-[34px] items-center justify-center rounded-full border border-border-track bg-surface text-ink-soft"
            >
              <History size={17} strokeWidth={2} />
            </span>
          }
        />
      }
      nav={<BottomNav />}
      className="bg-warm p-[14px]"
    >
      <div
        aria-hidden
        className="mb-[9px] flex h-[38px] items-center gap-2 rounded-input border border-border-input bg-surface px-3"
      >
        <Search size={14} strokeWidth={2} className="text-ink-disabled" />
        <span className="text-[13px] text-ink-disabled">Search items…</span>
      </div>

      <div aria-hidden className="mb-[11px] flex gap-[6px] overflow-x-auto">
        {CATEGORY_CHIPS.map((label, index) => (
          <span
            key={label}
            className={
              index === 0
                ? "flex-none rounded-pill bg-terracotta px-3 py-[5px] text-[11px] font-extrabold text-white"
                : "flex-none rounded-pill border border-border-input bg-surface px-3 py-[5px] text-[11px] font-bold text-ink-soft"
            }
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-[11px]">
        {items.map((item) => (
          <StoreItemCard key={item.id} item={item} />
        ))}
      </div>
    </AppShell>
  );
}

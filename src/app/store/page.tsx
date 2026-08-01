import { History } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PersistentHeader } from "@/components/layout/persistent-header";
import { StoreBrowser } from "@/components/store/store-browser";
import { storeItemsForUser } from "@/lib/store";

export const metadata: Metadata = {
  title: "Store · TaskTails",
};

/**
 * STOR-01 — the store listing, per `design_handoff/TaskTails Screens.dc.html`'s
 * "Store — Group A" frame. Replaces the `ComingSoon` placeholder `BottomNav`
 * (SHR-01) has pointed at since it shipped.
 *
 * The grid and search (`StoreBrowser`, STOR-02) are real. The header's
 * history icon and the category chips still render matching the mock exactly
 * but are inert — no navigation, no filtering — since STOR-03 (category
 * filter) and STOR-09 (history page) are separate, unbuilt tickets. Same
 * "render the control, wire it up later" pattern TASK-01 used for its own
 * then-unbuilt "+ New task" pill. The history icon's markup matches the
 * style guide's own "Header — title" sample exactly (`/style-guide`).
 *
 * `PersistentHeader`'s title variant is STOR-08's coin balance display,
 * already shipped by INF-12 — same "done by reuse" relationship TASK-06 had
 * to INF-12's greeting variant.
 *
 * Reads `storeItemsForUser()` directly, same server-component pattern
 * `TasksPage`/`ZooPage` use for their own list reads — no network hop needed.
 * `StoreBrowser` filters that same array client-side rather than re-fetching
 * per keystroke, since STOR-02 asks for real-time filtering and every item's
 * `locked` state is already resolved for this user in the one server read.
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
      <StoreBrowser items={items} />
    </AppShell>
  );
}

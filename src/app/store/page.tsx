import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PersistentHeader } from "@/components/layout/persistent-header";
import type { ReactNode } from "react";

import { CartActivityBadge } from "@/components/store/cart-activity-badge";
import { CartCountProvider } from "@/components/store/cart-count-context";
import { CartLink } from "@/components/store/cart-link";
import { FlashSaleBanner } from "@/components/store/flash-sale-banner";
import { RecentPurchasesBadge } from "@/components/store/recent-purchases-badge";
import { StockBadge } from "@/components/store/stock-badge";
import { StoreBrowser } from "@/components/store/store-browser";
import { UrgencyLanguageNote } from "@/components/store/urgency-language-note";
import { cartForUser } from "@/lib/cart";
import { storeItemsForUser } from "@/lib/store";
import { groupGatedData } from "@/lib/study-group";
import { urgencyDataForItems } from "@/lib/urgency";

export const metadata: Metadata = {
  title: "Store · TaskTails",
};

/**
 * STOR-01 — the store listing, per `design_handoff/TaskTails Screens.dc.html`'s
 * "Store — Group A" frame. Replaces the `ComingSoon` placeholder `BottomNav`
 * (SHR-01) has pointed at since it shipped.
 *
 * The grid and search (`StoreBrowser`, STOR-02) are real. The category chips
 * still render matching the mock exactly but are inert — no filtering —
 * since STOR-03 hasn't shipped. Same "render the control, wire it up later"
 * pattern TASK-01 used for its own then-unbuilt "+ New task" pill.
 *
 * The header's action slot is a cart icon linking to STOR-06's `/store/cart`
 * (with a count badge), not the mock's history icon — a deliberate,
 * user-directed swap: the design handoff never actually shows how a user
 * reaches the cart from here, and the history icon was the closest existing
 * affordance to repurpose rather than inventing a second icon slot. History
 * itself isn't lost, just relocated — `/store/cart`'s own header carries it
 * instead, per the same instruction.
 *
 * The badge (`CartLink`) reads its count from `CartCountProvider`
 * (`cart-count-context.tsx`) rather than a plain prop — found live after
 * shipping that a prop-only badge only reflected the count as of the last
 * page load, so adding an item didn't move it until a refresh. The provider
 * wraps both the header and `StoreBrowser`'s grid (siblings in this tree,
 * so a prop from one can't reach the other) and `StoreItemCard`'s
 * add-to-cart button calls its `increment()` the moment a `POST
 * /api/store/cart` succeeds.
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
 *
 * `showFlashSale` (URG-01) goes through `groupGatedData()` — `true` for Group
 * B, `null` for Group A/signed-out — rather than `currentStudyGroup()`
 * directly, both to reuse the one enforcement point INF-17 built for exactly
 * this and to keep the group value itself from ever reaching a client
 * component: only the pre-decided `<FlashSaleBanner />` element (or `null`)
 * crosses into `StoreBrowser`, never a boolean the client could branch on.
 *
 * `urgencyBadges` (URG-02/URG-03) follows the same `groupGatedData()`
 * pattern, one level deeper: `urgencyDataForItems()` (URG-08) needs the
 * resolved item ids, so `items` is awaited before the `Promise.all` rather
 * than inside it, and only unlocked items get badges built for them — the
 * same "unlocked only" call STOR-05's add-to-cart button already made.
 * `urgencyDataForItems()` is called directly rather than fetching
 * `GET /api/store/urgency-data` over HTTP — this is already a server
 * component, so that would just be an unnecessary network hop back to
 * itself, same reasoning as reading `storeItemsForUser()` directly instead
 * of `/api/store/items`.
 *
 * Each unlocked item gets `<StockBadge />`, `<CartActivityBadge />`, or both
 * stacked in a fragment, per `urgencyDataForItems()`'s own seeded
 * `showStockBadge`/`showCartActivityBadge` selection (URG-03, confirmed with
 * the user) — every item shows at least one, since the two badges share one
 * corner and `StoreItemCard` renders whatever it's handed without knowing
 * how many pieces are inside it.
 *
 * `urgencyNotes` (URG-04/URG-05) is a second map for a different card slot
 * (below the category label, not the corner badges) — `<RecentPurchasesBadge
 * />` or `<UrgencyLanguageNote />`, never both: the user chose mutual
 * exclusivity for this slot (unlike the corner badges' "both allowed"),
 * since two full sentences stacked read as too crowded for a 172px card.
 * `urgencyDataForItems()`'s `noteSelection` seed (URG-08) already guarantees
 * `showRecentPurchases`/`showUrgencyLanguage` are never both true, so this
 * is a plain if/else-if rather than needing its own selection logic here.
 */
export default async function StorePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const items = await storeItemsForUser(userId);

  const [cart, showFlashSale, urgencyRows] = await Promise.all([
    cartForUser(userId),
    groupGatedData(() => true),
    groupGatedData(() =>
      urgencyDataForItems(
        userId,
        items.map((item) => item.id),
      ),
    ),
  ]);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const urgencyBadges: Record<string, ReactNode> = {};
  const urgencyNotes: Record<string, ReactNode> = {};
  if (urgencyRows) {
    for (const item of items) {
      if (item.locked) continue;
      const row = urgencyRows.find((candidate) => candidate.itemId === item.id);
      if (!row) continue;
      urgencyBadges[item.id] = (
        <>
          {row.showStockBadge && <StockBadge stock={row.stock} />}
          {row.showCartActivityBadge && <CartActivityBadge count={row.cartActivity} />}
        </>
      );
      if (row.showRecentPurchases) {
        urgencyNotes[item.id] = <RecentPurchasesBadge count={row.recentPurchases} />;
      } else if (row.showUrgencyLanguage) {
        urgencyNotes[item.id] = <UrgencyLanguageNote />;
      }
    }
  }

  return (
    <CartCountProvider initialCount={cartCount}>
      <AppShell
        header={<PersistentHeader title="Store" action={<CartLink />} />}
        nav={<BottomNav />}
        className="bg-warm p-[14px]"
      >
        <StoreBrowser
          items={items}
          flashSaleBanner={showFlashSale ? <FlashSaleBanner /> : null}
          urgencyBadges={urgencyBadges}
          urgencyNotes={urgencyNotes}
        />
      </AppShell>
    </CartCountProvider>
  );
}

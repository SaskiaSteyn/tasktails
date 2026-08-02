import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PersistentHeader } from "@/components/layout/persistent-header";
import { CartCountProvider } from "@/components/store/cart-count-context";
import { CartLink } from "@/components/store/cart-link";
import { FlashSaleBanner } from "@/components/store/flash-sale-banner";
import { StoreBrowser } from "@/components/store/store-browser";
import { cartForUser } from "@/lib/cart";
import { storeItemsForUser } from "@/lib/store";
import { groupGatedData } from "@/lib/study-group";

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
 */
export default async function StorePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [items, cart, showFlashSale] = await Promise.all([
    storeItemsForUser(userId),
    cartForUser(userId),
    groupGatedData(() => true),
  ]);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

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
        />
      </AppShell>
    </CartCountProvider>
  );
}

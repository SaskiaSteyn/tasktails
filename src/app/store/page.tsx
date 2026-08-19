import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PersistentHeader } from "@/components/layout/persistent-header";
import type { ReactNode } from "react";

import { BundleTimerBadge } from "@/components/store/bundle-timer-badge";
import { BuyOneGetOneBadge } from "@/components/store/buy-one-get-one-badge";
import { CartActivityBadge } from "@/components/store/cart-activity-badge";
import { CartCountProvider } from "@/components/store/cart-count-context";
import { CartLink } from "@/components/store/cart-link";
import { CurrencyUrgencyBadge } from "@/components/store/currency-urgency-badge";
import { FlashSaleBanner } from "@/components/store/flash-sale-banner";
import { LuckyBoxOddsBoostBanner } from "@/components/store/lucky-box-odds-boost-banner";
import { LuckyBoxRecentPullsNote } from "@/components/store/lucky-box-recent-pulls-note";
import { RecentPurchasesBadge } from "@/components/store/recent-purchases-badge";
import { StockBadge } from "@/components/store/stock-badge";
import { StoreBrowser } from "@/components/store/store-browser";
import { UrgencyLanguageNote } from "@/components/store/urgency-language-note";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { StoreTimeTracker } from "@/components/telemetry/store-time-tracker";
import { redirectAdminsAway } from "@/lib/admin";
import { cartForUser } from "@/lib/cart";
import { LUCKY_BOX_COST_COINS, luckyBoxUrgencyForUser } from "@/lib/gacha";
import { levelOf, storeItemsForUser } from "@/lib/store";
import { groupGatedData } from "@/lib/study-group";
import { logTelemetryEvent } from "@/lib/telemetry";
import { fakeDiscountPricing, urgencyDataForItems } from "@/lib/urgency";

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
 * Each unlocked item gets exactly one of `<StockBadge />`/`<CartActivityBadge
 * />`, per `urgencyDataForItems()`'s own seeded `badgeSelection` — mutually
 * exclusive per the user (2026-08-04, after both tickets had already
 * shipped allowing both at once), same convention as the note slot below.
 *
 * `urgencyNotes` (URG-04/URG-05/URG-06/URG-07) is a second map for a
 * different card slot (below the category label, not the corner badges) —
 * `<RecentPurchasesBadge />`, `<UrgencyLanguageNote />`, `<BundleTimerBadge
 * />`, or `<CurrencyUrgencyBadge />`, never more than one: the user chose
 * mutual exclusivity for this slot (unlike the corner badges' "both
 * allowed"), since several full sentences/pills stacked read as too crowded
 * for a 172px card. `urgencyDataForItems()`'s `noteSelection` seed (URG-08)
 * already guarantees at most one of the four is ever true, so this is a
 * plain if/else-if chain rather than needing its own selection logic here.
 *
 * `design_handoff/ADDENDUM-store-zoo-art.md` layers a curated override on
 * top of that random seed, for exactly three named catalogue items (the
 * addendum's own pictured cards) — Sunflower seeds, Red collar, Hearts —
 * replacing whatever `urgencyDataForItems()` happened to pick for those
 * three with the addendum's fixed copy, since it specifies each verbatim
 * (down to "In 7 carts" as a *second*, stacked badge alongside "Only 4
 * left!" — the one place the corner slot's badges aren't mutually
 * exclusive). Every other catalogue item keeps the plain random seed
 * untouched. Hearts' wide "Double XP this hour only!" pill goes through the
 * ordinary `urgencyBadges` corner slot rather than a centred one of its own
 * (the addendum draws it top-centred; the user asked for it aligned with the
 * other cards' badges instead, 2026-08-18). `urgencyFooterNotes` (the
 * sold-in-the-last-hour line stacked above the price row) is one more
 * per-item map, for the addendum's new `StoreItemCard` slot, alongside
 * `pricing` — the addendum's fake discount
 * (`fakeDiscountPricing()`), computed for *every* unlocked Group-B item, not
 * just the three curated ones, per its own "applied to every purchasable
 * Group-B item" wording.
 *
 * `level` (SHR-06) is read via `levelOf()` — the same gate check
 * `storeItemsForUser()` already runs internally to resolve each item's own
 * `locked` flag — so `StoreBrowser` can show the full-screen "locked by
 * level" state's progress bar/levels-to-go label without a second fetch
 * when a locked card is tapped.
 *
 * `luckyBoxPrice` (`GACHA-10`) is `gacha.ts`'s `LUCKY_BOX_COST_COINS`,
 * passed down as a plain number rather than importing it into the client
 * `StoreBrowser` directly — see `LuckyBoxCard`'s own doc comment for why.
 *
 * `luckyBoxUrgency` (`GACHA-11`) is the same `groupGatedData()` pattern as
 * `showFlashSale`, one level deeper like `urgencyRows`: `null` for Group A,
 * or (for Group B) the fully-built `<LuckyBoxOddsBoostBanner /><LuckyBoxRecentPullsNote
 * .../></>` pair — the entire decided subtree, not a boolean, per
 * `StoreBrowser`'s own `luckyBoxUrgency` doc comment.
 */
/** The four real `StoreItemCategory` values `?category=` may deep-link to — anything else falls back to "ALL", same as never passing the param at all. */
const DEEP_LINKABLE_CATEGORIES = ["FOOD", "ACCESSORIES", "ANIMALS", "DECORATIONS"];

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  await redirectAdminsAway(userId);

  const { category } = await searchParams;
  const initialCategory = DEEP_LINKABLE_CATEGORIES.includes(category ?? "")
    ? (category as "FOOD" | "ACCESSORIES" | "ANIMALS" | "DECORATIONS")
    : "ALL";

  const items = await storeItemsForUser(userId);
  await logTelemetryEvent(userId, "STORE_VISIT", {});

  const [cart, showFlashSale, urgencyRows, level, luckyBoxUrgencyRow] = await Promise.all([
    cartForUser(userId),
    groupGatedData(() => true),
    groupGatedData(() =>
      urgencyDataForItems(
        userId,
        items.map((item) => item.id),
      ),
    ),
    levelOf(userId),
    groupGatedData(() => luckyBoxUrgencyForUser(userId)),
  ]);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const urgencyBadges: Record<string, ReactNode> = {};
  const urgencyNotes: Record<string, ReactNode> = {};
  if (urgencyRows) {
    for (const item of items) {
      if (item.locked) continue;
      const row = urgencyRows.find((candidate) => candidate.itemId === item.id);
      if (!row) continue;
      if (row.showStockBadge) {
        urgencyBadges[item.id] = <StockBadge stock={row.stock} />;
      } else if (row.showCartActivityBadge) {
        urgencyBadges[item.id] = <CartActivityBadge count={row.cartActivity} />;
      }
      if (row.showRecentPurchases) {
        urgencyNotes[item.id] = <RecentPurchasesBadge count={row.recentPurchases} />;
      } else if (row.showUrgencyLanguage) {
        urgencyNotes[item.id] = <UrgencyLanguageNote />;
      } else if (row.showBundleTimer) {
        urgencyNotes[item.id] = <BundleTimerBadge />;
      } else if (row.showCurrencyUrgency) {
        urgencyNotes[item.id] = <CurrencyUrgencyBadge />;
      }
    }
  }

  const urgencyFooterNotes: Record<string, ReactNode> = {};
  const pricing: Record<string, { list: number; sale: number }> = {};
  if (showFlashSale) {
    for (const item of items) {
      if (item.locked) continue;
      pricing[item.id] = fakeDiscountPricing(item.coinPrice);

      // The addendum's three curated cards — fixed copy, overriding
      // whatever `urgencyDataForItems()` seeded above for these three names
      // (both the corner badge and the inline note, so no random pick leaks
      // in alongside the curated one).
      if (["Sunflower seeds", "Red collar", "Hearts"].includes(item.name)) {
        delete urgencyBadges[item.id];
        delete urgencyNotes[item.id];
      }
      if (item.name === "Sunflower seeds") {
        // A plain wrapper, not a bare `<>...</>` Fragment — `StoreItemCard`'s
        // badge slot renders whatever it's handed as a single child, and two
        // *unwrapped* elements passed down as one prop value read to React
        // as an unkeyed list (the same class of warning a raw `.map()` sans
        // `key` would trigger).
        urgencyBadges[item.id] = (
          <div className="flex flex-col items-end gap-1">
            <StockBadge stock={4} />
            <CartActivityBadge count={7} />
          </div>
        );
        urgencyFooterNotes[item.id] = <RecentPurchasesBadge count={12} />;
      } else if (item.name === "Red collar") {
        urgencyBadges[item.id] = <BuyOneGetOneBadge />;
      } else if (item.name === "Hearts") {
        urgencyBadges[item.id] = <CurrencyUrgencyBadge overlay />;
        urgencyFooterNotes[item.id] = <RecentPurchasesBadge count={4} />;
      }
    }
  }

  return (
    <CartCountProvider initialCount={cartCount}>
      <AppShell
        header={<PersistentHeader title="Store" action={<CartLink />} />}
        nav={<BottomNav />}
        className="p-[14px]"
      >
        <SessionTracker />
        <StoreTimeTracker />
        <StoreBrowser
          items={items}
          flashSaleBanner={showFlashSale ? <FlashSaleBanner /> : null}
          urgencyBadges={urgencyBadges}
          urgencyNotes={urgencyNotes}
          urgencyFooterNotes={urgencyFooterNotes}
          pricing={pricing}
          level={level}
          initialCategory={initialCategory}
          luckyBoxPrice={LUCKY_BOX_COST_COINS}
          luckyBoxUrgency={
            luckyBoxUrgencyRow ? (
              <>
                <LuckyBoxOddsBoostBanner />
                <LuckyBoxRecentPullsNote count={luckyBoxUrgencyRow.recentPulls} />
              </>
            ) : null
          }
        />
      </AppShell>
    </CartCountProvider>
  );
}

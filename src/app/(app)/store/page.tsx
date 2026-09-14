import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";

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
import { CartPanel } from "@/components/store/cart-panel";
import { CurrencyUrgencyBadge } from "@/components/store/currency-urgency-badge";
import { FlashSaleBanner } from "@/components/store/flash-sale-banner";
import { LuckyBoxOddsBoostBanner } from "@/components/store/lucky-box-odds-boost-banner";
import { LuckyBoxRecentPullsNote } from "@/components/store/lucky-box-recent-pulls-note";
import { MyBoxesLink } from "@/components/store/my-boxes-link";
import { RecentPurchasesBadge } from "@/components/store/recent-purchases-badge";
import { StockBadge } from "@/components/store/stock-badge";
import {
  StoreBrowser,
  type StoreFilter,
} from "@/components/store/store-browser";
import { UrgencyLanguageNote } from "@/components/store/urgency-language-note";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { StoreTimeTracker } from "@/components/telemetry/store-time-tracker";
import { redirectAdminsAway } from "@/lib/admin";
import { cartForUser, dealsForUser } from "@/lib/cart";
import { currentEconomy } from "@/lib/economy";
import { luckyBoxUrgencyForUser, waitingLuckyBoxCount } from "@/lib/gacha";
import { LUCKY_BOXES } from "@/lib/lucky-boxes";
import { BUY_XP_COST_COINS, BUY_XP_GAIN_XP } from "@/lib/rewards";
import { levelOf, storeItemsForUser } from "@/lib/store";
import { groupGatedData } from "@/lib/study-group";
import { logTelemetryEvent } from "@/lib/telemetry";
import {
  CURATED_URGENCY_ITEM_NAMES,
  fakeDiscountPricing,
  flashSaleOnDay,
  urgencyDataForItems,
  urgencyDayKey,
} from "@/lib/urgency";

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
 * `showFlashSale` (URG-01) goes through `groupGatedData()` — `null` for Group
 * A/signed-out — rather than `currentStudyGroup()` directly, both to reuse the
 * one enforcement point INF-17 built for exactly this and to keep the group
 * value itself from ever reaching a client component: only the pre-decided
 * `<FlashSaleBanner />` element (or `null`) crosses into `StoreBrowser`, never
 * a boolean the client could branch on.
 *
 * **#291 — it is no longer `true` on every Group B day.** `flashSaleOnDay()`
 * rests the discount layer one UTC day in three, seeded per participant, for
 * the same habituation reason #187 already rotates the per-item badges: this
 * was the one Group B stimulus that never varied, and a store that is always
 * 20% off is not having a sale. It gates three things together, deliberately —
 * the banner, the inflated list prices and the three curated cards below. A
 * rest day still shows Group B's per-item badges and footer notes
 * (`urgencyRows` is seeded separately); it is a break from the *discount*, not
 * from the condition. On a rest day the three curated names fall back to their
 * own seeded treatment like every other item, rather than showing curated copy
 * with no sale behind it.
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
 * />` (corner, top-right on the art region), per `urgencyDataForItems()`'s
 * own seeded `badgeSelection` — mutually exclusive per the user (2026-08-04,
 * after both tickets had already shipped allowing both at once) — plus,
 * independently, at most one of `<RecentPurchasesBadge />`/
 * `<UrgencyLanguageNote />`/`<BundleTimerBadge />`/`<CurrencyUrgencyBadge
 * />` per `noteSelection`, in the footer below the image and above the
 * price. **Fixed 2026-08-25 (#202, "labels are all over the place")**: the
 * three notes other than `<RecentPurchasesBadge />` used to render through a
 * *third* card position instead (below the category label) — a spot
 * `design_handoff` never actually draws, so which of an item's urgency
 * stimuli ended up where looked arbitrary. `design_handoff/
 * ADDENDUM-store-zoo-art.md`'s placement is exactly two spots per card —
 * corner badges (stock/cart-activity, plus two curated exceptions below),
 * and a line above the price — so `noteSelection`'s four outcomes all build
 * into `urgencyFooterNotes` now, alongside `badgeSelection`'s pick in
 * `urgencyBadges`, and the removed third slot is gone from `StoreItemCard`
 * entirely.
 *
 * `design_handoff/ADDENDUM-store-zoo-art.md` layers a curated override on
 * top of that random seed, for exactly three named catalogue items (the
 * addendum's own pictured cards) — Sunflower seeds, Red collar, Hearts —
 * replacing whatever `urgencyDataForItems()` happened to pick for those
 * three with the addendum's fixed copy, since it specifies each verbatim
 * (down to "In 7 carts" as a *second*, stacked corner badge alongside "Only
 * 4 left!", and Hearts' "Double XP" pill rendering in the corner too rather
 * than the footer — the addendum's own art for these three specific cards,
 * confirmed with the user rather than generalised to every Group-B item).
 * Every other catalogue item keeps the plain random seed untouched.
 * `urgencyFooterNotes` is the same per-item map `noteSelection` already
 * builds above, alongside `pricing` — the addendum's fake discount
 * (`fakeDiscountPricing()`), computed for *every* unlocked Group-B item, not
 * just the three curated ones, per its own "applied to every purchasable
 * Group-B item" wording. Issue #185 revised what that discount *is*: `sale`
 * is now exactly the Group A price with `list` inflated 20% above it (no real
 * markdown). The multibuy cards add the whole bundle at once
 * (`bundleQuantities`). #300: the Red collar's "Buy 1 get 1" is a real deal
 * (`deals`, `dealsForUser()`) — two for one unit's price, struck beside the
 * pair's worth. A seeded `BundleTimerBadge` "Buy 2 get 1" is not: it adds three
 * and its price is all three units, so the "free" one is paid for, with the
 * usual 20%-inflated figure struck beside it (the cart then fakes a discount
 * for it — `cart-pricing.ts`).
 *
 * `level` (SHR-06) is read via `levelOf()` — the same gate check
 * `storeItemsForUser()` already runs internally to resolve each item's own
 * `locked` flag — so `StoreBrowser` can show the full-screen "locked by
 * level" state's progress bar/levels-to-go label without a second fetch
 * when a locked card is tapped.
 *
 * `unopenedBoxes` is the My boxes badge (`design_handoff_lucky_boxes` §2),
 * drawn in the phone header here and beside the search from `desk:` up.
 *
 * `luckyBoxUrgency` (`GACHA-11`) is the same `groupGatedData()` pattern as
 * `showFlashSale`, one level deeper like `urgencyRows`: `null` for Group A,
 * or (for Group B) the fully-built `<LuckyBoxOddsBoostBanner /><LuckyBoxRecentPullsNote
 * .../></>` pair — the entire decided subtree, not a boolean, per
 * `StoreBrowser`'s own `luckyBoxUrgency` doc comment.
 */
/** The `?category=` values that deep-link to a chip — the four real `StoreItemCategory` values plus "BOXES" (My boxes' empty state). Anything else falls back to "ALL", same as never passing the param at all. */
const DEEP_LINKABLE_CATEGORIES = [
  "BOXES",
  "FOOD",
  "ACCESSORIES",
  "ANIMALS",
  "DECORATIONS",
];

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
    ? (category as StoreFilter)
    : "ALL";

  const items = await storeItemsForUser(userId);

  // STOR-18's visit record, deliberately not awaited inline. Nothing this page
  // renders depends on the insert, so awaiting it here put a database write in
  // the critical path and delayed first byte for every store visit. `after()`
  // runs it once the response is finished — the row still lands (it also runs
  // when the request errors or redirects), it just stops holding up the page.
  // The `/api/telemetry/*` routes keep awaiting theirs: writing the row *is*
  // their response, and `session-end`'s `sendBeacon` would lose the event if
  // the handler returned first.
  // #291 — one instant for the whole render. Every fabricated stimulus used to
  // call `new Date()` for itself, so a request that crossed 00:00 UTC could
  // seed the badges from one day and the flash sale from the next; more to the
  // point, nothing recorded *which* day a participant was shown. Threaded from
  // here, and logged with the visit below.
  const now = new Date();

  const [
    cart,
    economy,
    showFlashSale,
    urgencyRows,
    level,
    luckyBoxUrgencyRow,
    unopenedBoxes,
    deals,
  ] = await Promise.all([
    cartForUser(userId),
    currentEconomy(),
    groupGatedData(() => flashSaleOnDay(userId, now)),
    groupGatedData(() =>
      urgencyDataForItems(
        userId,
        // Box keys ride along as pseudo item ids so the boxes get the same
        // seeded badges; a key like "PARCEL" can never collide with a cuid.
        [...items.map((item) => item.id), ...LUCKY_BOXES.map((box) => box.key)],
        now,
      ),
    ),
    levelOf(userId),
    groupGatedData(() => luckyBoxUrgencyForUser(userId, now)),
    waitingLuckyBoxCount(userId),
    dealsForUser(userId, now),
  ]);

  // #291 — what this visit was actually shown, so the analysis can rebuild it.
  // `urgencyDay` plus the participant's id is the whole seed: handing that
  // string back to `urgencyDataForItems()`/`flashSaleOnDay()` reproduces every
  // badge, note and number on this page exactly, months later, with no need to
  // have stored any of them. `flashSale` is null for Group A, who has no
  // urgency layer at all — the same shape `groupGatedData()` returns, so a
  // Group A row is distinguishable from a Group B rest day.
  after(() =>
    logTelemetryEvent(userId, "STORE_VISIT", {
      urgencyDay: urgencyDayKey(now),
      flashSale: showFlashSale,
    }),
  );
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const urgencyBadges: Record<string, ReactNode> = {};
  const urgencyFooterNotes: Record<string, ReactNode> = {};
  if (urgencyRows) {
    // Unlocked items, then the lucky boxes (keyed by box key — see the seed
    // above). A box is bought outright, never in a bundle, so a box whose seed
    // picks the "Buy 2 get 1" timer just goes without a footer note.
    const targets = [
      ...items.filter((item) => !item.locked).map((item) => ({ id: item.id, box: false })),
      ...LUCKY_BOXES.map((box) => ({ id: box.key, box: true })),
    ];
    for (const { id, box } of targets) {
      const row = urgencyRows.find((candidate) => candidate.itemId === id);
      if (!row) continue;
      // Corner badge, top-right on the art region — stock/cart-activity only.
      if (row.showStockBadge) {
        urgencyBadges[id] = <StockBadge key={id} stock={row.stock} />;
      } else if (row.showCartActivityBadge) {
        urgencyBadges[id] = <CartActivityBadge key={id} count={row.cartActivity} />;
      }
      // Footer note, below the image and above the price — everything else.
      if (row.showRecentPurchases) {
        urgencyFooterNotes[id] = (
          <RecentPurchasesBadge key={id} count={row.recentPurchases} />
        );
      } else if (row.showUrgencyLanguage) {
        urgencyFooterNotes[id] = <UrgencyLanguageNote key={id} />;
      } else if (row.showBundleTimer && !box) {
        urgencyFooterNotes[id] = <BundleTimerBadge key={id} />;
      } else if (row.showCurrencyUrgency) {
        urgencyFooterNotes[id] = <CurrencyUrgencyBadge key={id} />;
      }
    }
  }

  const pricing: Record<string, { list: number; sale: number }> = {};
  const bundleQuantities: Record<string, number> = {};
  if (showFlashSale) {
    // The lucky boxes take the same fake 20% off as every item.
    for (const box of LUCKY_BOXES) {
      pricing[box.key] = fakeDiscountPricing(box.coinPrice);
    }
    for (const item of items) {
      if (item.locked) continue;

      // #300 — "Buy 1 get 1" (a real deal): two collars for one's price.
      // "Buy 2 get 1" (not one): three units, priced as all three.
      if (deals[item.id] === "buy1get1") {
        pricing[item.id] = { list: item.coinPrice * 2, sale: item.coinPrice };
        bundleQuantities[item.id] = 2;
      } else if (deals[item.id] === "buy2get1") {
        pricing[item.id] = fakeDiscountPricing(item.coinPrice * 3);
        bundleQuantities[item.id] = 3;
      } else {
        pricing[item.id] = fakeDiscountPricing(item.coinPrice);
      }

      // The addendum's three curated cards — fixed copy, overriding
      // whatever `urgencyDataForItems()` seeded above for these three names
      // (both the corner badge and the footer note, so no random pick leaks
      // in alongside the curated one).
      if (CURATED_URGENCY_ITEM_NAMES.includes(item.name)) {
        delete urgencyBadges[item.id];
        delete urgencyFooterNotes[item.id];
      }
      if (item.name === "Sunflower seeds") {
        // A plain wrapper, not a bare `<>...</>` Fragment — `StoreItemCard`'s
        // badge slot renders whatever it's handed as a single child, and two
        // *unwrapped* elements passed down as one prop value read to React
        // as an unkeyed list (the same class of warning a raw `.map()` sans
        // `key` would trigger).
        //
        // Every element in these two maps carries `key={item.id}` for the
        // related reason documented on `flashSaleBanner` below: an element
        // built in this Server Component and handed to a client component as
        // a prop crosses the RSC boundary as a single-item children array,
        // and React's dev key check reports it as unkeyed as soon as the page
        // re-renders on the client — which adding to the cart now does, since
        // INF-22's desktop cart rail has to re-read the cart.
        urgencyBadges[item.id] = (
          <div key={item.id} className="flex flex-col items-end gap-1">
            <StockBadge stock={4} />
            <CartActivityBadge count={7} />
          </div>
        );
        urgencyFooterNotes[item.id] = (
          <RecentPurchasesBadge key={item.id} count={12} />
        );
      } else if (item.name === "Red collar") {
        urgencyBadges[item.id] = <BuyOneGetOneBadge key={item.id} />;
      } else if (item.name === "Hearts") {
        // The one exception: this stays in the corner (`overlay`), per the
        // addendum's own curated art for this specific card — see
        // `CurrencyUrgencyBadge`'s doc comment.
        urgencyBadges[item.id] = <CurrencyUrgencyBadge key={item.id} overlay />;
        urgencyFooterNotes[item.id] = (
          <RecentPurchasesBadge key={item.id} count={4} />
        );
      }
    }
  }

  return (
    <CartCountProvider initialCount={cartCount}>
      <AppShell
        header={
          <PersistentHeader
            title="Store"
            action={
              <>
                <MyBoxesLink count={unopenedBoxes} />
                <CartLink />
              </>
            }
          />
        }
        nav={<BottomNav />}
        // `desk:overflow-hidden`: from the rail width up, the category column,
        // the item grid and the cart each own their own scroll, so `main`
        // itself must not be the thing that scrolls.
        className="p-[14px] desk:overflow-hidden desk:px-8 desk:py-[26px]"
      >
        <SessionTracker />
        <StoreTimeTracker />
        {/* INF-22 — the handoff's three-column store. `StoreBrowser` owns the
            first two (category list, item grid); the cart rail is a sibling
            here rather than a slot inside it, so the client element is not
            threaded through another client component's props.

            The rail only appears from `xl:` up. At the 900px tablet width the
            category column and the grid have already spent the width, and a
            330px rail would leave a single column of items — the cart is one
            click away on `/store/cart`, as it is on a phone. */}
        <div className="flex min-h-0 flex-col desk:flex-1 desk:flex-row desk:gap-6">
          <StoreBrowser
            items={items}
            // `key` is load-bearing, not decoration: an element created in
            // this Server Component and handed to a client component as a
            // prop crosses the RSC boundary as a single-item children array,
            // so React's dev key check reports it as an unkeyed list child the
            // moment anything on the page re-renders on the client. Latent
            // until INF-22, which put a stateful cart rail on this page and
            // made adding to the cart refresh it. Bisected, not guessed.
            flashSaleBanner={
              showFlashSale ? <FlashSaleBanner key="flash-sale" /> : null
            }
            urgencyBadges={urgencyBadges}
            urgencyFooterNotes={urgencyFooterNotes}
            pricing={pricing}
            bundleQuantities={bundleQuantities}
            level={level}
            initialCategory={initialCategory}
            unopenedBoxes={unopenedBoxes}
            coins={economy?.coins ?? 0}
            buyXpCost={BUY_XP_COST_COINS}
            buyXpGain={BUY_XP_GAIN_XP}
            luckyBoxUrgency={
              luckyBoxUrgencyRow ? (
                <>
                  <LuckyBoxOddsBoostBanner />
                  <LuckyBoxRecentPullsNote
                    count={luckyBoxUrgencyRow.recentPulls}
                  />
                </>
              ) : null
            }
          />

          {/* The shipped `CartPanel`, not a rail-shaped rewrite of it, so
              quantity edits and checkout behave identically here and on
              `/store/cart`. */}
          <aside className="hidden w-[330px] flex-none flex-col overflow-hidden rounded-card-lg border border-border-track bg-warm xl:flex">
            <p className="flex-none border-b border-border-track px-[18px] py-[15px] font-display text-[16px] font-semibold">
              Your cart
            </p>
            <CartPanel
              initialCart={cart}
              coins={economy?.coins ?? 0}
              deals={deals}
              variant="rail"
            />
          </aside>
        </div>
      </AppShell>
    </CartCountProvider>
  );
}

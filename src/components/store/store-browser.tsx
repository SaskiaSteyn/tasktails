"use client";

import { Search } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { CartLink } from "@/components/store/cart-link";
import { LockedByLevelState } from "@/components/store/locked-by-level-state";
import { LuckyBoxCard } from "@/components/store/lucky-box-card";
import { StoreItemCard } from "@/components/store/store-item-card";
import type { StoreItemCategory } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import type { StoreItemWithLock } from "@/lib/store";

/**
 * "All" plus the four real categories. Values are the plain string literals
 * of `StoreItemCategory`, not the Prisma enum's runtime object — this
 * component is `"use client"`, and importing anything but the *type* from
 * `@/generated/prisma/client` breaks the browser build (see `StoreItemCard`'s
 * own doc comment for the exact error STOR-02 hit and fixed).
 */
/**
 * #232 — how many cards the grid renders before the scroll sentinel asks for
 * more. The catalogue is ~70 items and every card is a client component with
 * its own `next/image`, so drawing the whole thing on load cost 70 hydrations
 * and 70 IntersectionObservers before the first screen was usable. 24 fills
 * more than one screenful at every breakpoint (2 columns on the phone frame,
 * `auto-fill` from `desk:` up), so the reveal is never visible.
 */
const PAGE_SIZE = 24;

const CATEGORY_CHIPS: { label: string; value: StoreItemCategory | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Food", value: "FOOD" },
  { label: "Accessories", value: "ACCESSORIES" },
  { label: "Animals", value: "ANIMALS" },
  { label: "Decorations", value: "DECORATIONS" },
];

/**
 * STOR-02/STOR-03 — the store's search box and category chips, filtering the
 * STOR-01 grid by name and category in real time, combined with AND logic
 * (a query narrows within the selected category, not instead of it). Client
 * component (the rest of the page stays server-rendered) since filtering has
 * to react to a keystroke or a tap with no round trip — `items` arrives once
 * from the server via `storeItemsForUser()` and every change just re-derives
 * the visible subset from that same array.
 *
 * Search is case-insensitive substring match on `name` only — the ticket's
 * own wording ("filters visible items by name") — not description or
 * category, which the chips own separately.
 *
 * `flashSaleBanner` (URG-01) is a slot, not a boolean: `StorePage` decides
 * server-side whether the signed-in user is in Group B and only then renders
 * `<FlashSaleBanner />` into it, so this client component never receives —
 * and can never branch on — the study group itself (`study-group.ts`'s
 * isolation rule, NFR-TASK-3).
 *
 * `urgencyBadges` (URG-02/URG-03) is the same slot pattern, keyed per item:
 * `StorePage` builds at most one of `<StockBadge />`/`<CartActivityBadge />`
 * per unlocked item (plus two curated exceptions — `<BuyOneGetOneBadge />`
 * for Red collar, `<CurrencyUrgencyBadge overlay />` for Hearts, per
 * `ADDENDUM-store-zoo-art.md`'s own art), and hands the whole map down, so a
 * lookup by id is all this component (or `StoreItemCard`) ever does with it.
 *
 * `urgencyFooterNotes` (URG-04/URG-05/URG-06/URG-07) is the same pattern
 * again, for whichever of `<RecentPurchasesBadge />`/`<UrgencyLanguageNote
 * />`/`<BundleTimerBadge />`/`<CurrencyUrgencyBadge />` an item's
 * `noteSelection` picked — a different `StoreItemCard` slot from
 * `urgencyBadges` (below the image, above the price, not the corner).
 * **Fixed 2026-08-25 (#202, "labels are all over the place")**: three of
 * those four used to render through a *third* slot instead (below the
 * category label), a position `design_handoff` never actually draws; a
 * first attempt at this fix moved them into the corner alongside
 * `urgencyBadges` instead, which read as a banner smeared across the art
 * once a pill had that much text in it (confirmed live via screenshot) — the
 * addendum's own two real positions are corner badges and this footer line,
 * never three per card.
 *
 * `pricing` (`ADDENDUM-store-zoo-art.md`) is one more per-item map, same
 * lookup-by-id pattern — `StorePage` builds the curated Group-B overrides
 * (Sunflower seeds/Red collar/Hearts) and the general fake-discount pricing,
 * this component just forwards whichever of them an item has straight to
 * `StoreItemCard`'s matching slot.
 *
 * `bundleQuantities` (#185) is the same forward-only map, for the handful of
 * "Buy 2 get 1" `BundleTimerBadge` items: `StorePage` records `2` for each,
 * which becomes `StoreItemCard`'s `addQuantity` so the "+" adds two units at
 * once (its `pricing` entry already shows the two-unit figure). Absent for
 * every other card, where `addQuantity` falls back to 1.
 *
 * `level` (SHR-06) is the signed-in user's current level, read once here so
 * tapping a locked card can show the full-screen "locked by level" state
 * (`LockedByLevelState`) without a second round trip — `selectedLocked`
 * swaps it in for the search/chips/grid entirely, the same "replace the
 * content, keep the chrome" pattern `CartPanel`'s empty/confirmation states
 * use, rather than a modal stacked on top.
 *
 * `luckyBoxPrice` (`GACHA-10`) renders `<LuckyBoxCard />` full-width above
 * the grid, per the approved gacha design board — a plain number since it
 * isn't study-group-gated.
 *
 * `luckyBoxUrgency` (`GACHA-11`) is, though — the Group B odds-boost banner
 * plus recent-pulls line, passed straight through to `LuckyBoxCard`'s own
 * `extra` slot unexamined, same `ReactNode`-slot reasoning `flashSaleBanner`
 * already established: this component never branches on it, just forwards
 * whatever `StorePage` decided.
 */
export function StoreBrowser({
  items,
  flashSaleBanner,
  urgencyBadges,
  urgencyFooterNotes,
  pricing,
  bundleQuantities,
  level,
  luckyBoxPrice,
  luckyBoxUrgency,
  initialCategory = "ALL",
}: {
  items: StoreItemWithLock[];
  flashSaleBanner?: ReactNode;
  urgencyBadges?: Record<string, ReactNode>;
  urgencyFooterNotes?: Record<string, ReactNode>;
  pricing?: Record<string, { list: number; sale: number }>;
  /** #185 — per-item add-to-cart quantity for "Buy 2 get 1" bundle items (`2`); absent elsewhere. */
  bundleQuantities?: Record<string, number>;
  level: number;
  luckyBoxPrice: number;
  luckyBoxUrgency?: ReactNode;
  /** Pre-selects a category chip on load — `StorePage`'s own `?category=` deep link (e.g. `PetCustomizer`'s "Add accessory"/"Add decoration" tile), read once and otherwise behaving exactly like tapping the chip by hand. */
  initialCategory?: StoreItemCategory | "ALL";
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StoreItemCategory | "ALL">(initialCategory);
  const [selectedLocked, setSelectedLocked] = useState<StoreItemWithLock | null>(null);

  const visible = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "ALL" && item.category !== category) return false;
      if (trimmed && !item.name.toLowerCase().includes(trimmed)) return false;
      return true;
    });
  }, [items, query, category]);

  // #232 — the grid renders `visible.slice(0, shown)`; the sentinel below it
  // bumps `shown` as it scrolls into range. Filtering still runs over the full
  // `items` array above, so a search hit outside the current window is found
  // normally — only how many of the *results* are drawn is deferred.
  // The window is scoped to the filter it was grown under, so changing the
  // search or the category resets it back to one page without a reset effect
  // (`react-hooks/set-state-in-effect` — the state is derived during render
  // instead, per React's own "adjusting state when a prop changes").
  const filterKey = `${category}\u0000${query.trim().toLowerCase()}`;
  const [pager, setPager] = useState({ filterKey, shown: PAGE_SIZE });
  const shown = pager.filterKey === filterKey ? pager.shown : PAGE_SIZE;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    // Default root, deliberately: from `desk:` up the scroller is the column
    // below, not the viewport, and an observer against the viewport already
    // accounts for clipping by any ancestor scroll box — so one observer
    // covers both layouts. `rootMargin` loads the next page before the
    // sentinel is actually on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPager({ filterKey, shown: shown + PAGE_SIZE });
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filterKey, shown, visible.length]);

  const activeLabel = CATEGORY_CHIPS.find((chip) => chip.value === category)?.label;

  // The counts beside each category in the desktop column. Derived from the
  // same `items` array the grid filters, so they always agree with what
  // selecting the category actually shows — including the level-locked cards,
  // which are drawn (locked) rather than hidden.
  const counts = useMemo(() => {
    const byCategory = new Map<string, number>([["ALL", items.length]]);
    for (const item of items) {
      byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
    }
    return byCategory;
  }, [items]);

  if (selectedLocked) {
    return (
      <LockedByLevelState
        item={selectedLocked}
        level={level}
        onDismiss={() => setSelectedLocked(null)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-col desk:min-w-0 desk:flex-1">
      <div className="mb-[9px] flex flex-none items-center gap-2">
        <label className="flex h-[38px] min-w-0 flex-1 items-center gap-2 rounded-input border border-border-input bg-surface px-4">
          <Search size={16} strokeWidth={2} className="flex-none text-ink-faint" />
          <span className="sr-only">Search items</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search items…"
            // 16px, not the design's 13px — below 16px, iOS Safari/Chrome
            // zooms the whole page in on focus.
            className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-disabled py-[5px]"
          />
        </label>
        {/* The phone header's cart button, which `AppShell` hides from
            `desk:` up — and the cart rail that replaces it only appears at
            `xl:`. Without this, the 900–1279px band would have no way to
            reach the cart at all. */}
        <CartLink className="hidden desk:flex xl:hidden" />
      </div>

      {flashSaleBanner}

      <div
        role="radiogroup"
        aria-label="Category"
        // `flex-none`: this row is a flex item of `main` (`flex-col`,
        // `overflow-y-auto`). Per the flexbox spec, a flex item with any
        // non-`visible` overflow (this row's own `overflow-x-auto`, needed
        // so long category lists scroll sideways) gets an automatic minimum
        // size of 0 instead of its content size — so without `flex-none`
        // this is the one element the browser will shrink to nothing when
        // `main` is short on vertical space, which is exactly the 0-height
        // collapse reported live. Nothing else on the page has this overflow
        // + flex-child combination, which is why only this row broke.
        // `p-1` with matching negative margins: `overflow-x-auto` makes this
        // a scroll box on both axes, and the tabs exactly fill its height, so
        // a focused tab's ring (`outline-offset: 2px`) was clipped on every
        // side. The padding gives it 4px to live in and the negative margins
        // put the row back where it was, to the pixel. Pre-dates INF-22 — the
        // phone chip row had it too — but this is now a tab bar people will
        // arrow through, so it matters more.
        className="no-scrollbar -mx-1 -mt-1 mb-[7px] flex flex-none gap-[6px] overflow-x-auto p-1 desk:gap-2"
      >
        {CATEGORY_CHIPS.map((chip) => {
          const active = chip.value === category;
          return (
            <button
              key={chip.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCategory(chip.value)}
              className={cn(
                "flex flex-none items-center gap-[6px] rounded-pill px-3 py-[5px] text-[11px] transition-colors duration-120",
                "desk:px-[15px] desk:py-[7px] desk:text-[13px]",
                active
                  ? "bg-terracotta font-extrabold text-white"
                  : "border border-border-input bg-surface font-bold text-ink-soft hover:border-checkbox",
              )}
            >
              {chip.label}
              {/* Desktop only: there is no room for it beside the label in the
                  phone frame's chip row, and `aria-hidden` because the count
                  is not part of what the radio is called. */}
              <span
                aria-hidden
                className={cn(
                  "hidden font-extrabold desk:inline",
                  active ? "text-white/70" : "text-ink-faint",
                )}
              >
                {counts.get(chip.value) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* `desk:px-1`: from `desk:` up this column is the scroll box, and a
          scroll box clips on every axis — a card flush against its edge loses
          the 4px its focus ring needs (`outline-offset: 2px`, globals.css).
          Level-locked cards are buttons, so the outermost column of them is
          exactly where that shows. */}
      <div className="flex min-w-0 flex-col desk:min-h-0 desk:flex-1 desk:overflow-y-auto desk:px-1">
        <LuckyBoxCard price={luckyBoxPrice} extra={luckyBoxUrgency} />

        {visible.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-soft">
            {query.trim() ? (
              <>No items match &ldquo;{query.trim()}&rdquo;{category === "ALL" ? "" : ` in ${activeLabel}`}.</>
            ) : (
              <>No items in {activeLabel}.</>
            )}
          </p>
        ) : (
          // `items-start`, not Grid's default `stretch` — a card whose footer
          // carries a `footerNote` line (URG-04/05/06/07) is naturally taller
          // than a row-mate without one, and letting Grid stretch the shorter
          // card to match used to leave a visible gap between its title and
          // its art (see `StoreItemCard`'s own comment on the `mt-auto` this
          // replaced) rather than just... not being exactly as tall. Reported
          // live from a real Group B account.
          //
          // `auto-fill` rather than a fixed column count from `desk:` up, per
          // the handoff's own grid spec — which is also what makes the 900px
          // "2-up" behaviour fall out of the same rule rather than needing a
          // second breakpoint.
          <div className="grid grid-cols-2 items-start gap-[11px] desk:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] desk:gap-4">
            {visible.slice(0, shown).map((item) => (
              <StoreItemCard
                key={item.id}
                item={item}
                badge={urgencyBadges?.[item.id]}
                footerNote={urgencyFooterNotes?.[item.id]}
                pricing={pricing?.[item.id]}
                addQuantity={bundleQuantities?.[item.id]}
                onLockedClick={() => setSelectedLocked(item)}
              />
            ))}
          </div>
        )}

        {/* The scroll sentinel — only rendered while there is a next page, so
            the observer above can't loop once the grid is fully drawn. */}
        {shown < visible.length ? <div ref={sentinelRef} aria-hidden className="h-px flex-none" /> : null}
      </div>
    </div>
  );
}

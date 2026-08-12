"use client";

import { Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

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
 * `StorePage` builds whichever badge(s) an unlocked item should have —
 * `<StockBadge />`, `<CartActivityBadge />`, or both — and hands the whole
 * map down, so a lookup by id is all this component (or `StoreItemCard`)
 * ever does with it.
 *
 * `urgencyNotes` (URG-04) is the same pattern again for `<RecentPurchasesBadge
 * />`, kept as a separate map from `urgencyBadges` since it renders through
 * `StoreItemCard`'s different `note` slot, not the corner-badge one.
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
  urgencyNotes,
  level,
  luckyBoxPrice,
  luckyBoxUrgency,
}: {
  items: StoreItemWithLock[];
  flashSaleBanner?: ReactNode;
  urgencyBadges?: Record<string, ReactNode>;
  urgencyNotes?: Record<string, ReactNode>;
  level: number;
  luckyBoxPrice: number;
  luckyBoxUrgency?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StoreItemCategory | "ALL">("ALL");
  const [selectedLocked, setSelectedLocked] = useState<StoreItemWithLock | null>(null);

  const visible = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "ALL" && item.category !== category) return false;
      if (trimmed && !item.name.toLowerCase().includes(trimmed)) return false;
      return true;
    });
  }, [items, query, category]);

  const activeLabel = CATEGORY_CHIPS.find((chip) => chip.value === category)?.label;

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
    <>
      <label className="mb-[9px] flex h-[38px] items-center gap-2 rounded-input border border-border-input bg-surface px-4">
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
        className="no-scrollbar mb-[11px] flex flex-none gap-[6px] overflow-x-auto"
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
                "flex-none rounded-pill px-3 py-[5px] text-[11px] transition-colors duration-120",
                active
                  ? "bg-terracotta font-extrabold text-white"
                  : "border border-border-input bg-surface font-bold text-ink-soft hover:border-checkbox",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

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
        <div className="grid grid-cols-2 gap-[11px]">
          {visible.map((item) => (
            <StoreItemCard
              key={item.id}
              item={item}
              badge={urgencyBadges?.[item.id]}
              note={urgencyNotes?.[item.id]}
              onLockedClick={() => setSelectedLocked(item)}
            />
          ))}
        </div>
      )}
    </>
  );
}

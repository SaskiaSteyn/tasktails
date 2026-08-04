"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

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
 */
export function StoreBrowser({ items }: { items: StoreItemWithLock[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StoreItemCategory | "ALL">("ALL");

  const visible = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "ALL" && item.category !== category) return false;
      if (trimmed && !item.name.toLowerCase().includes(trimmed)) return false;
      return true;
    });
  }, [items, query, category]);

  const activeLabel = CATEGORY_CHIPS.find((chip) => chip.value === category)?.label;

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
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-disabled py-[5px]"
        />
      </label>

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
        className="mb-[11px] flex flex-none gap-[6px] overflow-x-auto"
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
            <StoreItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

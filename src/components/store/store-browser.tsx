"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { StoreItemCard } from "@/components/store/store-item-card";
import type { StoreItemWithLock } from "@/lib/store";

const CATEGORY_CHIPS = ["All", "Food", "Accessories", "Animals", "Decorations"] as const;

/**
 * STOR-02 — the store's search box, filtering the STOR-01 grid by name in
 * real time. Client component (the rest of the page stays server-rendered)
 * since filtering has to react to keystrokes with no round trip — `items`
 * arrives once from the server via `storeItemsForUser()` and every keystroke
 * just re-derives the visible subset from that same array.
 *
 * Case-insensitive substring match on `name` only — the ticket's own wording
 * ("filters visible items by name") — not description or category, which
 * STOR-03's chips own separately.
 *
 * The category chips still render here (moved from `page.tsx` so the whole
 * toolbar lives in one component) but stay inert — STOR-03 hasn't shipped.
 */
export function StoreBrowser({ items }: { items: StoreItemWithLock[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return items;
    return items.filter((item) => item.name.toLowerCase().includes(trimmed));
  }, [items, query]);

  return (
    <>
      <label className="mb-[9px] flex h-[38px] items-center gap-2 rounded-input border border-border-input bg-surface px-3">
        <Search size={14} strokeWidth={2} className="flex-none text-ink-disabled" />
        <span className="sr-only">Search items</span>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search items…"
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-disabled"
        />
      </label>

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

      {visible.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-ink-soft">
          No items match &ldquo;{query.trim()}&rdquo;.
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

"use client";

import { useMemo, useState } from "react";

import { AchievementRow } from "@/components/profile/achievement-row";
import { cn } from "@/lib/cn";
import type { AchievementCategory, AchievementWithState } from "@/lib/achievements";

type Tab = AchievementCategory | "ALL";

/** Order and labels per `design_handoff/ADDENDUM-achievements.md`: "All · Streaks · Tasks · Petting Zoo · Items". */
const TABS: { label: string; value: Tab }[] = [
  { label: "All", value: "ALL" },
  { label: "Streaks", value: "STREAKS" },
  { label: "Tasks", value: "TASKS" },
  { label: "Petting Zoo", value: "PETTING_ZOO" },
  { label: "Items", value: "ITEMS" },
];

/**
 * PRO-18 — the Achievements screen's category tabs and scrollable row list.
 * Client component since selecting a tab has to react instantly with no
 * round trip — the full 38-achievement list (with `category`/`progress`
 * already attached by `achievementsForUser()`) arrives once from the server
 * and every tab switch just re-filters that same array, the same "fetch
 * once, filter client-side" shape `StoreBrowser`'s search/category chips use
 * for a catalogue of comparable size.
 */
export function AchievementsList({
  achievements,
}: {
  achievements: AchievementWithState[];
}) {
  const [tab, setTab] = useState<Tab>("ALL");

  const visible = useMemo(
    () =>
      tab === "ALL"
        ? achievements
        : achievements.filter((achievement) => achievement.category === tab),
    [achievements, tab],
  );

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Category"
        className="mb-[11px] flex flex-none gap-[7px] overflow-x-auto"
      >
        {TABS.map((entry) => {
          const active = entry.value === tab;
          return (
            <button
              key={entry.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTab(entry.value)}
              className={cn(
                "flex-none rounded-pill px-[13px] py-[6px] text-[11.5px] font-extrabold transition-colors duration-120",
                active ? "bg-terracotta text-white" : "bg-input text-ink-soft",
              )}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {visible.map((achievement) => (
          <AchievementRow key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </>
  );
}

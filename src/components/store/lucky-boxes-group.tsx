"use client";

import { type ReactNode, useState } from "react";

import { LuckyBoxCard } from "@/components/store/lucky-box-card";
import { LuckyBoxSheet } from "@/components/store/lucky-box-sheet";
import type { LuckyBoxDefinition } from "@/lib/lucky-boxes";

/**
 * Store · boxes group (1a). Sits above the catalogue in the normal store
 * scroll. No header: the handoff's collapsible "LUCKY BOXES 4" label was
 * removed entirely at the user's direction (2026-09-13).
 *
 * `urgency` is the Group B stimulus slot (`GACHA-11`), decided server-side by
 * `StorePage` exactly as it was for the single box — this component never
 * learns the study group.
 */
export function LuckyBoxesGroup({
  boxes,
  coins,
  urgency,
  badges,
  footerNotes,
  pricing,
}: {
  boxes: LuckyBoxDefinition[];
  coins: number;
  urgency?: ReactNode;
  /** Group-B per-box corner badge, footer note and fake 20% off — keyed by box key, same maps the item cards read. */
  badges?: Record<string, ReactNode>;
  footerNotes?: Record<string, ReactNode>;
  pricing?: Record<string, { list: number; sale: number }>;
}) {
  const [selected, setSelected] = useState<LuckyBoxDefinition | null>(null);

  return (
    <section className="mb-[11px] flex-none desk:mb-4">
      {urgency ? <div className="mb-[9px]">{urgency}</div> : null}

      <div className="grid auto-rows-[1fr] grid-cols-2 gap-[11px] desk:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] desk:gap-4">
        {boxes.map((box) => (
          <LuckyBoxCard
            key={box.key}
            box={box}
            badge={badges?.[box.key]}
            footerNote={footerNotes?.[box.key]}
            pricing={pricing?.[box.key]}
            onSelect={() => setSelected(box)}
          />
        ))}
      </div>

      <LuckyBoxSheet
        box={selected}
        pricing={pricing}
        coins={coins}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

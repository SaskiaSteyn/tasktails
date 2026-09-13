"use client";

import { type ReactNode, useState } from "react";

import { LuckyBoxCard } from "@/components/store/lucky-box-card";
import { LuckyBoxSheet } from "@/components/store/lucky-box-sheet";
import type { LuckyBoxDefinition } from "@/lib/lucky-boxes";

/**
 * Store · boxes group (1a). Sits above the catalogue in the normal store
 * scroll. Always open — the handoff's collapsible header was removed at the
 * user's direction (2026-09-13), so the header is a plain label and count.
 *
 * `urgency` is the Group B stimulus slot (`GACHA-11`), decided server-side by
 * `StorePage` exactly as it was for the single box — this component never
 * learns the study group.
 */
export function LuckyBoxesGroup({
  boxes,
  coins,
  urgency,
}: {
  boxes: LuckyBoxDefinition[];
  coins: number;
  urgency?: ReactNode;
}) {
  const [selected, setSelected] = useState<LuckyBoxDefinition | null>(null);

  return (
    <section className="mb-[11px] flex-none desk:mb-4">
      <p className="mt-1 mb-[9px] flex items-center gap-[7px] text-[11px] font-extrabold tracking-[.6px] text-ink-soft uppercase">
        Lucky boxes
        <span className="rounded-pill bg-amber-tint px-[7px] py-[2px] text-[10px] text-amber-text">
          {boxes.length}
        </span>
      </p>

      {urgency ? <div className="mb-[9px]">{urgency}</div> : null}

      <div className="grid auto-rows-[1fr] grid-cols-2 gap-[11px] desk:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] desk:gap-4">
        {boxes.map((box) => (
          <LuckyBoxCard
            key={box.key}
            box={box}
            onSelect={() => setSelected(box)}
          />
        ))}
      </div>

      <LuckyBoxSheet
        box={selected}
        coins={coins}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

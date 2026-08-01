import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import Image from "next/image";

import { Coin } from "@/components/ui/coin";
import type { StoreItemCategory } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import type { StoreItemWithLock } from "@/lib/store";

/**
 * STOR-01's item card — per-item name, image, coin price, level requirement
 * and availability, matching `design_handoff/TaskTails Screens.dc.html`'s
 * "Store — Group A" frame (STORE item card).
 *
 * **Deliberately not the mock's "locked" visual** (desaturated fill, lock
 * icon, "Unlocks at Lvl N" chip) — that treatment is STOR-04's own separate
 * ticket ("Item card — level-gated state"), decided explicitly rather than
 * guessed. Every card renders in the same unlocked style here; a locked
 * item's `levelRequired` is shown as a plain "Lvl {n}" label in place of the
 * add button, since STOR-01's own wording asks for the level requirement and
 * availability to be visible, just not styled as locked yet.
 *
 * The "+" add-to-cart button renders (matching the mock) but is inert — no
 * `onClick` — since STOR-05 owns that. Same "render the control, wire it up
 * later" pattern TASK-01 used for its own then-unbuilt "+ New task" pill. A
 * plain `<div>`, not `<button>`, so it isn't announced or focusable as a
 * control that does nothing.
 *
 * Category comparisons below use the string literals ("FOOD", "ANIMALS", …)
 * rather than the `StoreItemCategory` enum's runtime object — this component
 * is reachable from `StoreBrowser` (STOR-02, `"use client"`), and importing
 * anything but the *type* from `@/generated/prisma/client` pulls Prisma's
 * Node-only runtime into the browser bundle, which fails to compile
 * ("chunking context does not support external modules (request:
 * node:module)"). `StoreItemCategory` is still imported as a type, so the
 * `Record` keys stay checked against the schema's real category set.
 */

const CATEGORY_LABEL: Record<StoreItemCategory, string> = {
  FOOD: "Food",
  ACCESSORIES: "Accessory",
  DECORATIONS: "Decoration",
  ANIMALS: "Animal",
};

/**
 * Icon well tint + icon colour per category, matching the mock's per-item
 * accent (amber for food, sage for accessories, violet for decorations).
 * Animals render the real SVG artwork instead (`imageUrl` is a file path
 * there, an icon name everywhere else — same split `pets.ts`'s cards use).
 */
const CATEGORY_WELL: Record<StoreItemCategory, { bg: string; icon: string }> = {
  FOOD: { bg: "bg-amber-tint", icon: "text-amber-text" },
  ACCESSORIES: { bg: "bg-sage-tint", icon: "text-sage-text" },
  DECORATIONS: { bg: "bg-violet-tint", icon: "text-violet-text" },
  // Unused — animals render `Image` artwork instead, never this well's icon.
  ANIMALS: { bg: "bg-input", icon: "" },
};

export function StoreItemCard({ item }: { item: StoreItemWithLock }) {
  const isAnimal = item.category === "ANIMALS";

  return (
    <div className="rounded-card border border-border-track bg-warm px-[11px] py-3">
      <div
        className={cn(
          "mb-[9px] flex h-[54px] items-center justify-center rounded-[11px]",
          isAnimal ? "bg-input" : CATEGORY_WELL[item.category].bg,
        )}
      >
        {isAnimal ? (
          <Image src={item.imageUrl} alt="" width={40} height={40} className="block size-10" />
        ) : (
          <DynamicIcon
            // Free-form DB string (icon names for goods, SVG paths for
            // animals per `seed.ts`) — cast rather than widen `IconName`,
            // same reasoning `feed-sheet.tsx` documents for its own cast.
            name={item.imageUrl as IconName}
            size={26}
            strokeWidth={2.2}
            className={CATEGORY_WELL[item.category].icon}
            aria-hidden
          />
        )}
      </div>

      <p className="truncate text-[12.5px] font-extrabold">{item.name}</p>
      <p className="mb-2 text-[10.5px] text-ink-faint">{CATEGORY_LABEL[item.category]}</p>

      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-[3px]">
          <Coin size={12} />
          <span className="text-[12px] font-extrabold text-amber-text">
            {/* Locale pinned explicitly — see `coin.tsx`'s `CoinPill` for
                the hydration mismatch this avoids. */}
            {item.coinPrice.toLocaleString("en-US")}
          </span>
        </span>

        {item.locked ? (
          <span className="text-[10.5px] font-bold text-ink-faint">
            Lvl {item.levelRequired}
          </span>
        ) : (
          <div
            aria-hidden
            className="flex size-[26px] flex-none items-center justify-center rounded-[8px] bg-terracotta text-[16px] leading-none text-white"
          >
            +
          </div>
        )}
      </div>
    </div>
  );
}

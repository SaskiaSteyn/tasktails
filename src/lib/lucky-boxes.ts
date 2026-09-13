import type { LuckyBoxKey, StoreItemRarity } from "@/generated/prisma/client";

/**
 * The four Lucky Boxes, per `design_handoff/design_handoff_lucky_boxes/`.
 *
 * Prisma-free on purpose (type imports only), so the store grid, the buy
 * sheet and My boxes — all client components — can read prices and odds
 * directly. `gacha.ts` imports Prisma at module scope and cannot be.
 *
 * Trove is 270 (user's call, 2026-09-13 — the phone board's figure, over the
 * README's 300/280). Shiny odds are the handoff's per-box ones, replacing the
 * flat 10% `SHINY_PULL_CHANCE` the single box used.
 */
export type LuckyBoxDefinition = {
  key: LuckyBoxKey;
  name: string;
  itemCount: number;
  coinPrice: number;
  /** A card comes back shiny 1 in this many, rolled per item. */
  shinyOneIn: number;
};

/** Store order — smallest first. */
export const LUCKY_BOXES: LuckyBoxDefinition[] = [
  {
    key: "PARCEL",
    name: "Lucky Parcel",
    itemCount: 1,
    coinPrice: 50,
    shinyOneIn: 60,
  },
  {
    key: "BUNDLE",
    name: "Lucky Bundle",
    itemCount: 3,
    coinPrice: 120,
    shinyOneIn: 40,
  },
  {
    key: "HAUL",
    name: "Lucky Haul",
    itemCount: 5,
    coinPrice: 200,
    shinyOneIn: 25,
  },
  {
    key: "TROVE",
    name: "Lucky Trove",
    itemCount: 7,
    coinPrice: 270,
    shinyOneIn: 18,
  },
];

export function luckyBox(key: LuckyBoxKey): LuckyBoxDefinition {
  return LUCKY_BOXES.find((box) => box.key === key)!;
}

/** "1 item" / "5 items". */
export function itemCountLabel(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

/**
 * Confirmed 2026-08-07. Per item, unchanged by box size — a bigger box buys
 * more rolls, not better ones. Must sum to 1; `rollRarity()` assumes it does.
 */
export const RARITY_ODDS: Record<StoreItemRarity, number> = {
  COMMON: 0.55,
  RARE: 0.3,
  EPIC: 0.12,
  LEGENDARY: 0.03,
};

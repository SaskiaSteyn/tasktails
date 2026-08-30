import type {
  StoreItem,
  StoreItemRarity,
  UserEconomy,
} from "@/generated/prisma/client";
import { createPetForTransaction, type PetWithItem } from "@/lib/pets";
import { prisma } from "@/lib/prisma";
import { seededInt } from "@/lib/urgency";

/**
 * GACHA-04 — `POST /api/gacha/pull`'s pipeline: the Lucky Box.
 *
 * A deliberate exception to the "one module per table" rule the rest of the
 * lib follows, same reasoning `checkout.ts`'s own doc comment gives for
 * itself: one pull reads and writes `UserEconomy`, `StoreItem`, and either
 * `InventoryItem` or `Pet` (never both) as one atomic unit, so everything
 * has to run on the same `tx` client. The goods-vs-animal split below is
 * copied from `checkout.ts`'s own split — `Pet` has no `quantity` column and
 * an animal pull becomes its own distinct pet via `pets.ts`'s
 * `createPetForTransaction()`, exactly like a cart checkout adopting one;
 * every other category increments-or-creates an `InventoryItem` row the same
 * way a goods line does.
 *
 * **Price, odds and the pity threshold are confirmed** (2026-08-07, along
 * with the two decisions below) — no longer drafts pending sign-off.
 *
 * **Hard pity (`GACHA-05`)** forces a Legendary once `UserEconomy.
 * pullsSinceLegendary` (`GACHA-02`) reaches `HARD_PITY_THRESHOLD`, and
 * resets it to 0 on any Legendary result, natural or forced. Deliberately
 * invisible: nothing in `GachaPullResult` or the API response says whether a
 * given pull was forced, carries the counter, or the threshold — the design
 * board is explicit that pity has no meter, no counter and no rules copy
 * anywhere in the UI, so a forced Legendary has to be indistinguishable from
 * a lucky one at every layer above this function, not just in what the
 * client happens to render.
 *
 * **The pull pool is unrestricted (2026-08-07 decision, superseding this
 * function's original level-capped design)**: every `StoreItem` of the
 * rolled rarity is eligible, full stop — "users are allowed to get every
 * possible item in the catalog." The earlier design (in-level pool, with a
 * small `ABOVE_LEVEL_PULL_CHANCE` chase roll into an above-level pool) is
 * gone entirely, not just widened. What still varies by level is whether
 * the pull is immediately usable: **`locked` is true only when the item's
 * `levelRequired` is more than one level above the account's current
 * level** — "allowed to unlock the pulled item if it is within 1 level
 * above their current level and below." An item exactly one level above
 * unlocks immediately on pull; anything further stays locked until the
 * account actually reaches `levelRequired - 1`.
 *
 * SERVER ONLY — imports Prisma.
 */

/** Confirmed 2026-08-07. */
export const LUCKY_BOX_COST_COINS = 150;

/** Confirmed 2026-08-07. Must sum to 1; `rollRarity()` assumes it does. */
export const RARITY_ODDS: Record<StoreItemRarity, number> = {
  COMMON: 0.55,
  RARE: 0.3,
  EPIC: 0.12,
  LEGENDARY: 0.03,
};

/**
 * Confirmed 2026-08-07. The pull that brings `pullsSinceLegendary` to this
 * many is forced Legendary regardless of `rollRarity()`'s result.
 */
export const HARD_PITY_THRESHOLD = 30;

/**
 * Confirmed 2026-08-07 — an item pulled at up to this many levels above the
 * account's current level unlocks immediately; anything further stays
 * locked. See the file doc comment.
 */
export const UNLOCK_LEVEL_BUFFER = 1;

const RARITY_ORDER: StoreItemRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

/** Weighted roll against `RARITY_ODDS`. Pure — no Prisma, no clock, easy to test against a stubbed `Math.random`. */
export function rollRarity(random: () => number = Math.random): StoreItemRarity {
  const roll = random();
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += RARITY_ODDS[rarity];
    if (roll < cumulative) return rarity;
  }
  // Floating-point rounding guard (odds sum to ~1 but not exactly, and a
  // `random()` of exactly the theoretical max would fall through) — should
  // be unreachable in practice.
  return RARITY_ORDER[RARITY_ORDER.length - 1];
}

export type PulledItem = StoreItem & {
  /**
   * True when `levelRequired` is more than `UNLOCK_LEVEL_BUFFER` levels
   * above the puller's level at pull time — the design board's "Added,
   * locked — unlocks at Lvl N" reveal state (GACHA-14). An item exactly one
   * level above unlocks immediately and reads as `false` here.
   */
  locked: boolean;
};

export type GachaPullResult =
  | {
      ok: true;
      spent: number;
      item: PulledItem;
      /** Set only when `item.category === "ANIMALS"` — a freshly adopted pet, same shape `checkout.ts` returns. */
      pet: PetWithItem | null;
      economy: UserEconomy;
    }
  | { ok: false; reason: "no-account" }
  | { ok: false; reason: "insufficient-coins"; coins: number; shortfall: number }
  /** Defensive — unreachable against `GACHA-03`'s seed (every rarity has at least one item), kept for a catalogue that regresses. */
  | { ok: false; reason: "empty-catalogue"; rarity: StoreItemRarity };

/**
 * Spends `LUCKY_BOX_COST_COINS` and grants one random item.
 *
 * Coins are read with `SELECT … FOR UPDATE`, the same pattern `checkout()`
 * and `buyXp()` use — two pulls submitted together must not both pass the
 * balance check against the same starting total.
 *
 * Rarity is rolled first, independently of the account's level, then
 * overridden to Legendary if this pull would bring `pullsSinceLegendary`
 * (`GACHA-02`) to `HARD_PITY_THRESHOLD` (`GACHA-05`) — silently; the caller
 * can't tell a forced result from a lucky one. The pool is every `StoreItem`
 * of that rarity, full stop — no level filter at all (2026-08-07 decision,
 * see the file doc comment) — so `pool.length === 0` only happens if a
 * rarity has zero items anywhere in the catalogue.
 */
export async function pullLuckyBox(userId: string): Promise<GachaPullResult> {
  return prisma.$transaction(async (tx) => {
    const lockedRow = await tx.$queryRaw<
      { coins: number; level: number; pullsSinceLegendary: number }[]
    >`
      SELECT "coins", "level", "pullsSinceLegendary"
      FROM "UserEconomy"
      WHERE "userId" = ${userId}
      FOR UPDATE`;

    const account = lockedRow[0];
    if (!account) return { ok: false, reason: "no-account" } as const;

    if (account.coins < LUCKY_BOX_COST_COINS) {
      return {
        ok: false,
        reason: "insufficient-coins",
        coins: account.coins,
        shortfall: LUCKY_BOX_COST_COINS - account.coins,
      } as const;
    }

    // Hard pity (GACHA-05): this pull is the one that would reach the
    // threshold, so it's forced regardless of the roll. `+ 1` because
    // `pullsSinceLegendary` counts pulls *before* this one.
    const pityForces = account.pullsSinceLegendary + 1 >= HARD_PITY_THRESHOLD;
    const rarity = pityForces ? "LEGENDARY" : rollRarity();
    const pullsSinceLegendary =
      rarity === "LEGENDARY" ? 0 : account.pullsSinceLegendary + 1;

    const pool = await tx.storeItem.findMany({ where: { rarity } });

    if (pool.length === 0) {
      return { ok: false, reason: "empty-catalogue", rarity } as const;
    }

    const storeItem = pool[Math.floor(Math.random() * pool.length)];
    const locked = storeItem.levelRequired > account.level + UNLOCK_LEVEL_BUFFER;

    let pet: PetWithItem | null = null;
    if (storeItem.category === "ANIMALS") {
      pet = await createPetForTransaction(tx, userId, storeItem);
    } else {
      const existing = await tx.inventoryItem.findFirst({
        where: { userId, storeItemId: storeItem.id, equippedToPetId: null },
      });

      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: 1 } },
        });
      } else {
        await tx.inventoryItem.create({
          data: { userId, storeItemId: storeItem.id, quantity: 1 },
        });
      }
    }

    const economy = await tx.userEconomy.update({
      where: { userId },
      data: { coins: { decrement: LUCKY_BOX_COST_COINS }, pullsSinceLegendary },
    });

    return {
      ok: true,
      spent: LUCKY_BOX_COST_COINS,
      item: { ...storeItem, locked },
      pet,
      economy,
    } as const;
  });
}

export type LuckyBoxUrgencyData = {
  /** "N opened in the last hour" — the design board's recent-purchases pattern for the Lucky Box card (GACHA-11). */
  recentPulls: number;
};

/**
 * GACHA-09 — the Group B urgency copy for the Lucky Box store card.
 * Deliberately has **no knowledge of the study group itself**, same as
 * `urgencyDataForItems()` (URG-08) — `StorePage` wraps this in
 * `groupGatedData()` when rendering the Lucky Box card (`GACHA-10`/
 * `GACHA-11`), exactly the way it already wraps `urgencyDataForItems()`
 * rather than branching on the study group itself.
 *
 * Range 15–30, not `urgency.ts`'s 3–7 for a real catalogue item's recent
 * purchases — the approved design board's own mockup shows "23 opened in
 * the last hour" as this exact copy's example value, and 3–7 (sized for one
 * item among a whole catalogue) could never produce it. The Lucky Box is
 * framed as a single, unusually popular feature rather than an ordinary
 * catalogue item, so a higher range fits both the approved example and the
 * premise.
 *
 * No countdown value here on purpose — `GACHA-11`'s "Double your Legendary
 * chance today" timer is a self-contained client-side countdown, the same
 * pattern `FlashSaleBanner` (URG-01) already established ("resets on page
 * load", confirmed with the user rather than server-fabricated) — there is
 * nothing for the backend to compute for it.
 *
 * `recentPulls` rotates once per UTC day, inherited from `seededInt()`'s
 * day-bucketed seed (#187) — the same daily reshuffle catalogue urgency
 * gets, so the Lucky Box's "N opened in the last hour" isn't left as the one
 * frozen stimulus.
 */
export function luckyBoxUrgencyForUser(userId: string): LuckyBoxUrgencyData {
  return {
    recentPulls: seededInt(userId, "lucky-box", "recentPurchases", 15, 30),
  };
}

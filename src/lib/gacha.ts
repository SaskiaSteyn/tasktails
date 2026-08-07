import type {
  StoreItem,
  StoreItemRarity,
  UserEconomy,
} from "@/generated/prisma/client";
import { createPetForTransaction, type PetWithItem } from "@/lib/pets";
import { prisma } from "@/lib/prisma";

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
 * **Price and odds are still drafts**, per `research_gacha_mechanics.md`
 * §4.4 and the `Gatcha.md`/`Gatcha.csv` ticket list — confirm before
 * treating these constants as final.
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
 * **A real finding while building this**: the "small chance of an
 * above-level pull" (`research_gacha_mechanics.md` G-5, drafted at 2–5%)
 * turns out not to be a rare edge case for every rarity. `GACHA-03`'s seed
 * only placed Legendary items at `levelRequired: 20` (nothing lower exists
 * in *Gatcha stuffs.pdf* to seed there) and Epic items at 7 or 10 — so for
 * any account below level 20, the "at or below current level" pool for
 * Legendary is *always* empty, and below level 7 the same is true for Epic.
 * `pullLuckyBox()` below therefore falls back to the above-level pool
 * whenever the in-level one is empty, regardless of the `ABOVE_LEVEL_PULL_
 * CHANCE` roll — otherwise a Legendary result would have nothing to grant.
 * This is arguably the *point* of Legendary rather than a bug: it's an
 * aspirational chase tier reachable only through the box, not through
 * levelling (the level system's own thresholds, `levels.ts`, don't even
 * reach 20). Worth surfacing to the user rather than silently working around
 * it, since it changes what "2–5% chance" actually means in practice.
 *
 * SERVER ONLY — imports Prisma.
 */

/** Draft — needs sign-off (`research_gacha_mechanics.md` §4.4). */
export const LUCKY_BOX_COST_COINS = 150;

/** Draft — needs sign-off. Must sum to 1; `rollRarity()` assumes it does. */
export const RARITY_ODDS: Record<StoreItemRarity, number> = {
  COMMON: 0.55,
  RARE: 0.3,
  EPIC: 0.12,
  LEGENDARY: 0.03,
};

/**
 * Draft, within `research_gacha_mechanics.md` G-5's 2–5% range. Only ever
 * consulted when the in-level pool for the rolled rarity is non-empty — see
 * the file doc comment for when that isn't the case.
 */
export const ABOVE_LEVEL_PULL_CHANCE = 0.03;

/**
 * Draft — needs sign-off. The pull that brings `pullsSinceLegendary` to this
 * many is forced Legendary regardless of `rollRarity()`'s result.
 */
export const HARD_PITY_THRESHOLD = 30;

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
  /** True when this landed above the puller's level at pull time — the design board's "locked" reveal state. */
  aboveLevel: boolean;
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
 * can't tell a forced result from a lucky one. The pool is then every
 * `StoreItem` of that rarity at or below the account's level; if that's
 * empty, or (drafted at `ABOVE_LEVEL_PULL_CHANCE`) the chase roll hits, the
 * pool becomes every item of that rarity *above* the account's level
 * instead — see the file doc comment for why the empty-pool case is the
 * common path for Legendary/Epic today, not a rare exception.
 */
export async function pullLuckyBox(userId: string): Promise<GachaPullResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { coins: number; level: number; pullsSinceLegendary: number }[]
    >`
      SELECT "coins", "level", "pullsSinceLegendary"
      FROM "UserEconomy"
      WHERE "userId" = ${userId}
      FOR UPDATE`;

    const account = locked[0];
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

    const inLevelPool = await tx.storeItem.findMany({
      where: { rarity, levelRequired: { lte: account.level } },
    });

    let pool = inLevelPool;
    let aboveLevel = false;

    if (inLevelPool.length === 0 || Math.random() < ABOVE_LEVEL_PULL_CHANCE) {
      const abovePool = await tx.storeItem.findMany({
        where: { rarity, levelRequired: { gt: account.level } },
      });
      if (abovePool.length > 0) {
        pool = abovePool;
        aboveLevel = true;
      }
      // If abovePool is also empty, `pool` stays whatever it already was
      // (possibly still empty) — handled by the check below rather than
      // assumed away.
    }

    if (pool.length === 0) {
      return { ok: false, reason: "empty-catalogue", rarity } as const;
    }

    const storeItem = pool[Math.floor(Math.random() * pool.length)];

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
      item: { ...storeItem, aboveLevel },
      pet,
      economy,
    } as const;
  });
}

import type {
  LuckyBoxKey,
  Prisma,
  StoreItem,
  StoreItemRarity,
  UserEconomy,
} from "@/generated/prisma/client";
import { luckyBox, RARITY_ODDS } from "@/lib/lucky-boxes";
import { createPetForTransaction } from "@/lib/pets";
import { prisma } from "@/lib/prisma";
import { logTelemetryEvent } from "@/lib/telemetry";
import { seededInt } from "@/lib/urgency";

/**
 * GACHA-04 — the Lucky Box pipeline, reshaped by
 * `design_handoff/design_handoff_lucky_boxes/`: a box is now *bought*
 * (`buyLuckyBox()`, `POST /api/gacha/boxes`) and waits unopened in My boxes,
 * then *opened* (`openLuckyBox()`, `POST /api/gacha/boxes/[id]/open`), which
 * rolls one item per card in the box. Box definitions live in the Prisma-free
 * `lucky-boxes.ts`.
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
 * **Odds and the pity threshold are confirmed** (2026-08-07, along
 * with the two decisions below) — no longer drafts pending sign-off.
 *
 * **Hard pity (`GACHA-05`)** forces a Legendary once `UserEconomy.
 * pullsSinceLegendary` (`GACHA-02`) reaches `HARD_PITY_THRESHOLD`, and
 * resets it to 0 on any Legendary result, natural or forced. Deliberately
 * invisible: nothing in `OpenLuckyBoxResult` or the API response says whether a
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

/**
 * Confirmed 2026-08-07. The pull that brings `pullsSinceLegendary` to this
 * many is forced Legendary regardless of `rollRarity()`'s result. Every item
 * in a box counts as one pull.
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
export function rollRarity(
  random: () => number = Math.random,
): StoreItemRarity {
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

export type PulledItem = Pick<
  StoreItem,
  "id" | "name" | "category" | "imageUrl" | "rarity" | "levelRequired"
> & {
  /**
   * True when `levelRequired` is more than `UNLOCK_LEVEL_BUFFER` levels
   * above the opener's level at open time (GACHA-14's "added, locked" state).
   * An item exactly one level above unlocks immediately and reads `false`.
   */
  locked: boolean;
  /**
   * #276 — whether this card came out Shiny, rolled per item at the box's
   * `shinyOneIn`, independently of the tier. The reveal is the only screen
   * that reads it off the pull; everywhere else reads the owned row.
   */
  shiny: boolean;
};

/** What `OwnedLuckyBox.results` holds, one entry per card in deal order. */
type StoredPull = { storeItemId: string; shiny: boolean; locked: boolean };

export type BuyLuckyBoxResult =
  | { ok: true; boxId: string; economy: UserEconomy }
  | { ok: false; reason: "no-account" }
  | {
      ok: false;
      reason: "insufficient-coins";
      coins: number;
      shortfall: number;
    };

/**
 * Spends the box's price and puts it on the shelf, unopened. Nothing is
 * rolled here — see `OwnedLuckyBox`'s schema comment.
 *
 * Coins are read with `SELECT … FOR UPDATE`, the same pattern `checkout()`
 * and `buyXp()` use — two buys submitted together must not both pass the
 * balance check against the same starting total.
 */
export async function buyLuckyBox(
  userId: string,
  key: LuckyBoxKey,
): Promise<BuyLuckyBoxResult> {
  const { name, itemCount, coinPrice } = luckyBox(key);

  return prisma.$transaction(async (tx) => {
    const lockedRow = await tx.$queryRaw<{ coins: number }[]>`
      SELECT "coins" FROM "UserEconomy" WHERE "userId" = ${userId} FOR UPDATE`;

    const account = lockedRow[0];
    if (!account) return { ok: false, reason: "no-account" } as const;

    if (account.coins < coinPrice) {
      return {
        ok: false,
        reason: "insufficient-coins",
        coins: account.coins,
        shortfall: coinPrice - account.coins,
      } as const;
    }

    const box = await tx.ownedLuckyBox.create({
      data: { userId, boxKey: key, coinSpent: coinPrice },
    });
    // In the transaction, like checkout's `ITEM_PURCHASED`: no purchase
    // without its event, and no event for a buy that rolled back.
    await logTelemetryEvent(
      userId,
      "LUCKY_BOX_PURCHASED",
      { boxId: box.id, boxKey: key, name, itemCount, coinSpent: coinPrice },
      tx,
    );
    const economy = await tx.userEconomy.update({
      where: { userId },
      data: { coins: { decrement: coinPrice } },
    });

    return { ok: true, boxId: box.id, economy } as const;
  });
}

export type OpenLuckyBoxResult =
  | { ok: true; boxKey: LuckyBoxKey; items: PulledItem[] }
  | { ok: false; reason: "not-found" | "no-account" }
  /** Defensive — unreachable against `GACHA-03`'s seed (every rarity has at least one item), kept for a catalogue that regresses. */
  | { ok: false; reason: "empty-catalogue"; rarity: StoreItemRarity };

/**
 * Opens one owned box: rolls `itemCount` items, grants them, and stamps the
 * row opened with the results — all in one transaction.
 *
 * **Idempotent per box.** The box row is locked first; if it was already
 * opened, the stored results come back unchanged and nothing is granted
 * again. A double tap, or a refresh mid-animation, can't re-roll.
 *
 * Each item is rolled exactly as the single box used to roll its one item:
 * rarity against `RARITY_ODDS`, overridden to Legendary by hard pity
 * (`GACHA-05`) when the running `pullsSinceLegendary` reaches the threshold,
 * then a uniform pick from every `StoreItem` of that rarity (no level filter,
 * 2026-08-07). All rolls happen before any write, so an empty rarity aborts
 * the open with nothing granted.
 */
export async function openLuckyBox(
  userId: string,
  boxId: string,
): Promise<OpenLuckyBoxResult> {
  return prisma.$transaction(async (tx) => {
    const boxRows = await tx.$queryRaw<
      {
        boxKey: LuckyBoxKey;
        openedAt: Date | null;
        results: StoredPull[] | null;
      }[]
    >`
      SELECT "boxKey", "openedAt", "results"
      FROM "OwnedLuckyBox"
      WHERE "id" = ${boxId} AND "userId" = ${userId}
      FOR UPDATE`;

    const box = boxRows[0];
    if (!box) return { ok: false, reason: "not-found" } as const;

    if (box.openedAt && box.results) {
      return {
        ok: true,
        boxKey: box.boxKey,
        items: await hydrate(tx, box.results),
      } as const;
    }

    const accountRows = await tx.$queryRaw<
      { level: number; pullsSinceLegendary: number }[]
    >`
      SELECT "level", "pullsSinceLegendary"
      FROM "UserEconomy"
      WHERE "userId" = ${userId}
      FOR UPDATE`;

    const account = accountRows[0];
    if (!account) return { ok: false, reason: "no-account" } as const;

    const { itemCount, shinyOneIn } = luckyBox(box.boxKey);
    const catalogue = await tx.storeItem.findMany({
      where: { rarity: { not: null } },
    });

    // Roll everything first — no writes until every card has an item.
    let pullsSinceLegendary = account.pullsSinceLegendary;
    const pulls: { storeItem: StoreItem; shiny: boolean; locked: boolean }[] =
      [];
    for (let i = 0; i < itemCount; i++) {
      // `+ 1` because the counter holds pulls *before* this one.
      const rarity =
        pullsSinceLegendary + 1 >= HARD_PITY_THRESHOLD
          ? "LEGENDARY"
          : rollRarity();
      pullsSinceLegendary =
        rarity === "LEGENDARY" ? 0 : pullsSinceLegendary + 1;

      const pool = catalogue.filter((item) => item.rarity === rarity);
      if (pool.length === 0) {
        return { ok: false, reason: "empty-catalogue", rarity } as const;
      }

      const storeItem = pool[Math.floor(Math.random() * pool.length)];
      pulls.push({
        storeItem,
        // Rolled after the tier and independently of it (#276).
        shiny: Math.random() < 1 / shinyOneIn,
        locked: storeItem.levelRequired > account.level + UNLOCK_LEVEL_BUFFER,
      });
    }

    const now = new Date();
    for (const { storeItem, shiny } of pulls) {
      await grant(tx, userId, storeItem, shiny, now);
    }

    const results: StoredPull[] = pulls.map(({ storeItem, shiny, locked }) => ({
      storeItemId: storeItem.id,
      shiny,
      locked,
    }));

    await tx.ownedLuckyBox.update({
      where: { id: boxId },
      data: { openedAt: now, results },
    });
    await tx.userEconomy.update({
      where: { userId },
      data: { pullsSinceLegendary },
    });

    return {
      ok: true,
      boxKey: box.boxKey,
      items: pulls.map(({ storeItem, shiny, locked }) =>
        toPulledItem(storeItem, shiny, locked),
      ),
    } as const;
  });
}

function toPulledItem(
  storeItem: StoreItem,
  shiny: boolean,
  locked: boolean,
): PulledItem {
  const { id, name, category, imageUrl, rarity, levelRequired } = storeItem;
  return { id, name, category, imageUrl, rarity, levelRequired, shiny, locked };
}

async function hydrate(
  tx: Prisma.TransactionClient,
  results: StoredPull[],
): Promise<PulledItem[]> {
  const items = await tx.storeItem.findMany({
    where: { id: { in: results.map((pull) => pull.storeItemId) } },
  });
  return results.flatMap((pull) => {
    const item = items.find((candidate) => candidate.id === pull.storeItemId);
    return item ? [toPulledItem(item, pull.shiny, pull.locked)] : [];
  });
}

/**
 * One pulled item into the account. The goods-vs-animal split is copied from
 * `checkout.ts`: an animal becomes its own `Pet`; everything else increments
 * or creates an `InventoryItem` stack.
 */
async function grant(
  tx: Prisma.TransactionClient,
  userId: string,
  storeItem: StoreItem,
  shiny: boolean,
  now: Date,
) {
  if (storeItem.category === "ANIMALS") {
    await createPetForTransaction(tx, userId, storeItem, now, shiny);
    return;
  }

  const existing = await tx.inventoryItem.findFirst({
    // `shiny` belongs in this lookup, not just in the create below: a shiny is
    // not the same object as a plain one, so merging it into an existing plain
    // stack would silently destroy it. Shinies stack with shinies.
    where: { userId, storeItemId: storeItem.id, equippedToPetId: null, shiny },
  });

  if (existing) {
    await tx.inventoryItem.update({
      where: { id: existing.id },
      data: { quantity: { increment: 1 } },
    });
  } else {
    await tx.inventoryItem.create({
      data: { userId, storeItemId: storeItem.id, quantity: 1, shiny },
    });
  }
}

/**
 * My boxes' list — every box not yet fully revealed, newest first: unopened
 * ones (`openedAt` null) and opened ones whose reveal was left unfinished.
 */
export function waitingLuckyBoxesForUser(userId: string) {
  return prisma.ownedLuckyBox.findMany({
    where: { userId, revealedAt: null },
    orderBy: { purchasedAt: "desc" },
    select: { id: true, boxKey: true, purchasedAt: true, openedAt: true },
  });
}

/**
 * Stamps a box's reveal finished — every card turned — so My boxes stops
 * offering to continue it. Only an opened, unrevealed box of this user's
 * changes; anything else is a no-op.
 */
export async function markLuckyBoxRevealed(userId: string, boxId: string) {
  const { count } = await prisma.ownedLuckyBox.updateMany({
    where: { id: boxId, userId, openedAt: { not: null }, revealedAt: null },
    data: { revealedAt: new Date() },
  });
  return count > 0;
}

/**
 * Every box ever bought, opened or not, newest first — purchase history's
 * box rows. A box buy writes no `Transaction`; this row is its record.
 */
export function luckyBoxPurchasesForUser(userId: string) {
  return prisma.ownedLuckyBox.findMany({
    where: { userId },
    orderBy: { purchasedAt: "desc" },
    select: { id: true, boxKey: true, purchasedAt: true, coinSpent: true },
  });
}

/** The admin dashboard's share of "items purchased" that came from boxes. */
export function luckyBoxPurchaseCount(userId: string) {
  return prisma.ownedLuckyBox.count({ where: { userId } });
}

/** The store header's badge — the same boxes My boxes lists. */
export function waitingLuckyBoxCount(userId: string) {
  return prisma.ownedLuckyBox.count({ where: { userId, revealedAt: null } });
}

/** The reveal page's guard — null for someone else's box. */
export function ownedLuckyBox(userId: string, boxId: string) {
  return prisma.ownedLuckyBox.findFirst({
    where: { id: boxId, userId },
    select: { id: true, boxKey: true, openedAt: true, revealedAt: true },
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
export function luckyBoxUrgencyForUser(
  userId: string,
  /** #291 — passed in by `StorePage` so every stimulus on one render shares one instant, rather than each calling `new Date()` and risking a straddled UTC midnight. */
  date: Date = new Date(),
): LuckyBoxUrgencyData {
  return {
    recentPulls: seededInt(
      userId,
      "lucky-box",
      "recentPurchases",
      15,
      30,
      date,
    ),
  };
}

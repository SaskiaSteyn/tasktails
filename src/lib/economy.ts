import { auth } from "@/auth";
import type { UserEconomy } from "@/generated/prisma/client";
import { levelProgress, type LevelProgress } from "@/lib/levels";
import { prisma } from "@/lib/prisma";

/**
 * Every read of a participant's coins / XP / streak (INF-10, INF-12).
 *
 * Same rule as src/lib/users.ts: nothing outside this module touches
 * `prisma.userEconomy`, so the earning rules (ECO-01..ECO-05) land in one place
 * when they arrive.
 *
 * SERVER ONLY — imports `auth()` and Prisma.
 */

export type { UserEconomy };

/** What the persistent header draws. */
export type EconomySnapshot = LevelProgress & {
  coins: number;
  streak: number;
};

/**
 * The row for a user, or null if they have none.
 *
 * In practice every account gets one at creation (AUTH-04 creates it in the same
 * transaction), so a null here means the account is gone, not new.
 */
export async function economyForUser(
  userId: string,
): Promise<UserEconomy | null> {
  return prisma.userEconomy.findUnique({ where: { userId } });
}

/**
 * Turns a stored row into what the header renders.
 *
 * Level and XP progress are both derived from `xp` rather than read from the
 * `level` column. That column is ECO-05's denormalised copy — deriving here
 * means the level disc and the XP bar beside it are computed from one number and
 * can never disagree with each other, which is the failure a participant would
 * actually notice. If the two ever diverge, `xp` is the truth.
 */
export function snapshotOf(
  economy: Pick<UserEconomy, "coins" | "xp" | "streak">,
): EconomySnapshot {
  return {
    ...levelProgress(economy.xp),
    coins: Math.max(0, economy.coins),
    streak: Math.max(0, economy.streak),
  };
}

/** A signed-out or missing user reads as a fresh account rather than a crash. */
export const EMPTY_ECONOMY: EconomySnapshot = snapshotOf({
  coins: 0,
  xp: 0,
  streak: 0,
});

/**
 * The signed-in participant's economy, ready to render.
 *
 * Returns null when nobody is signed in — the header is only ever drawn on
 * authenticated screens, so a null is the caller's cue that it should not be
 * drawing one at all.
 */
export async function currentEconomy(): Promise<EconomySnapshot | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const economy = await economyForUser(userId);
  return economy ? snapshotOf(economy) : EMPTY_ECONOMY;
}

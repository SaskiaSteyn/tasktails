import type { UserSettings } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Every read and write of the Settings screen's toggles (INF-18, PRO-13/14/15).
 * Nothing outside this module touches `prisma.userSettings`, same rule as
 * `users.ts`/`economy.ts`/`tasks.ts`.
 *
 * SERVER ONLY — imports Prisma.
 */

export type { UserSettings };

export type SettingsPatch = Partial<
  Pick<
    UserSettings,
    "dailyReminder" | "streakAlert" | "soundEffects" | "reduceMotion"
  >
>;

/** The four toggles for one user, or `null` if the account is gone. */
export async function settingsForUser(
  userId: string,
): Promise<UserSettings | null> {
  return prisma.userSettings.findUnique({ where: { userId } });
}

/**
 * Persists a partial toggle change. No not-found guard — unlike `setAvatar`/
 * `setUsername`, this row is guaranteed to exist for any real account (AUTH-04
 * creates it in the same transaction as the account, INF-18), so a missing
 * row here would mean the account itself is gone, and this is only ever
 * called from a route that already has a live session for it.
 */
export async function updateSettings(
  userId: string,
  patch: SettingsPatch,
): Promise<UserSettings> {
  return prisma.userSettings.update({ where: { userId }, data: patch });
}

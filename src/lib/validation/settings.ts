import { z } from "zod";

/** PRO-15 — `PATCH /api/user/settings`'s body. Every field optional: a toggle flips one at a time. */
export const updateSettingsSchema = z.object({
  dailyReminder: z.boolean().optional(),
  streakAlert: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

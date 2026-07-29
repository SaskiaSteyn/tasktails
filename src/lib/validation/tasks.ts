import { z } from "zod";

/**
 * Shared client/server validation for task mutations (TASK-02/08, TASK-03/09).
 * Same messages the forms already showed as client-side errors before this
 * existed, kept in sync here so server-side re-validation can't disagree
 * with what the form told the user.
 *
 * One schema for both create and edit — the create sheet and the edit
 * screen send the same three fields under the same rules, so TASK-09's
 * route reuses this rather than declaring an near-identical second schema.
 */

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title."),
  /** 1-5, economy_system.md's Trivial..Epic tiers (TASK-3). */
  complexityTier: z
    .number()
    .int()
    .min(1, "Pick how big this is.")
    .max(5, "Pick how big this is."),
  dueDate: z.coerce.date().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// `fieldErrors()` isn't redeclared here — it's generic over any ZodError, not
// auth-specific despite living in validation/auth.ts. Re-exported so callers
// don't need to know that history.
export { fieldErrors } from "@/lib/validation/auth";

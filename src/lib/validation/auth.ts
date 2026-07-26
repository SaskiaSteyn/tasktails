import { z } from "zod";

/**
 * Shared client/server validation for the auth forms. The register page renders
 * these messages inline under the offending field (input error state), and the
 * mock API re-validates so the rules are enforced server-side too.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Re-enter your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** Flattens a Zod error into `{ field: firstMessage }` for the form state. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !result[field]) {
      result[field] = issue.message;
    }
  }
  return result;
}

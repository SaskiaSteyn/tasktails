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

/**
 * The username step. A handle, so it must be unique and typeable — the alphabet
 * is deliberately narrow (the addendum renders it as `@nico`). Case is not
 * significant; the store lowercases on write.
 *
 * The 3–20 character bounds are ours: the addendum specifies the look and the
 * availability behaviour but no length rule.
 */
export const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use at least 3 characters.")
    .max(20, "Use 20 characters or fewer.")
    .regex(/^[a-z0-9_]+$/, "Letters, numbers and underscores only."),
});

export type UsernameInput = z.infer<typeof usernameSchema>;

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

/**
 * Login deliberately does *not* reuse `passwordSchema`. Echoing the sign-up
 * rules back at someone signing in leaks them, and an account made before the
 * rules change still has to get in — length is the credentials provider's call.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * PRO-11/12 — the Settings "Change password" form. `currentPassword` isn't
 * `passwordSchema` for the same reason `loginSchema` isn't: it's checked
 * against whatever hash already exists, not against today's rules.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Re-enter your new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match.",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

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

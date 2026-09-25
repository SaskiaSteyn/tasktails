import { NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/mailer";
import { regenerateVerificationToken } from "@/lib/users";
import { emailSchema } from "@/lib/validation/auth";

/**
 * `POST /api/auth/verify/resend` — the "Resend email" action the login form
 * shows once `authorize()` rejects a sign-in with `email-not-verified`.
 *
 * Always answers 200 with the same generic message, whether the address is
 * unknown, already verified, or genuinely just got a fresh link — same
 * enumeration reasoning as `login-form.tsx`'s shared "don't match" error.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const email = emailSchema.safeParse(
    typeof body === "object" && body !== null ? (body as { email?: unknown }).email : undefined,
  );

  if (email.success) {
    const user = await regenerateVerificationToken(email.data);
    if (user?.verificationToken) {
      // Never let a mail-provider failure surface here — this route always
      // answers 200 regardless (see the doc comment above), so a thrown send
      // error would otherwise contradict its own contract.
      try {
        await sendVerificationEmail(
          user.email,
          user.verificationToken,
          process.env.AUTH_URL ?? new URL(request.url).origin,
        );
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

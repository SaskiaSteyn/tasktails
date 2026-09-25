import { NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/mailer";
import { createUser, EmailInUseError } from "@/lib/users";
import { fieldErrors, registerSchema } from "@/lib/validation/auth";

/**
 * `POST /api/auth/register` (AUTH-04).
 *
 * Creates the account, hashes the password, assigns the random A/B group and
 * initialises the `UserEconomy` record — the last three all inside
 * `createUser`, so an account can never exist half-built.
 *
 * `createUser` also issues a verification token; this route mails it before
 * responding. `AUTH_URL` (already required for NextAuth's own redirects, see
 * .env.example) supplies the link's origin rather than this request's own —
 * behind Caddy that's what actually resolves to the public domain.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request body." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const user = await createUser(parsed.data.email, parsed.data.password);

    // `verificationToken` is always set fresh by `createUser` for a brand-new
    // account — non-null in practice, the `!` just satisfies the type the
    // schema leaves nullable for the post-verification state.
    //
    // Not awaited-and-thrown: a mail provider outage (or, while SES is still
    // in its sandbox, sending to a real address that isn't pre-verified)
    // must not turn into a 500 that makes the account itself fail to create.
    // The account exists either way; "Resend verification email" on the
    // login form is the recovery path if the first send didn't land.
    try {
      await sendVerificationEmail(
        user.email,
        user.verificationToken!,
        process.env.AUTH_URL ?? new URL(request.url).origin,
      );
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }

    // The group is deliberately not returned — participants must not learn their
    // assignment, and the study screens read it from the session instead.
    return NextResponse.json(
      { user: { id: user.id, email: user.email } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof EmailInUseError) {
      return NextResponse.json(
        { fieldErrors: { email: error.message } },
        { status: 409 },
      );
    }
    throw error;
  }
}

import { NextResponse } from "next/server";

import { verifyEmailToken } from "@/lib/users";

/**
 * `GET /api/auth/verify?token=…` — the link `sendVerificationEmail` mails.
 *
 * A redirect rather than JSON: this is opened straight from an email client,
 * never fetched by the app's own JS. `/login` reads the `verified` param to
 * show the right banner (see `login-form.tsx`).
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const user = token ? await verifyEmailToken(token) : null;

  return NextResponse.redirect(
    new URL(user ? "/login?verified=1" : "/login?verified=0", request.url),
  );
}

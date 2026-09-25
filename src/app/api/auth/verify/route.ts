import { NextResponse } from "next/server";

import { verifyEmailToken } from "@/lib/users";

/**
 * `GET /api/auth/verify?token=…` — the link `sendVerificationEmail` mails.
 *
 * A redirect rather than JSON: this is opened straight from an email client,
 * never fetched by the app's own JS. `/login` reads the `verified` param to
 * show the right banner (see `login-form.tsx`).
 *
 * The redirect's origin comes from `AUTH_URL`, not `request.url` — behind
 * Caddy, `request.url` resolves to the container's own bind address
 * (`http://0.0.0.0:3000`), which is unreachable from outside and sent a real
 * verification click straight to a connection-refused page (#found live,
 * 2026-09-25). Same fix as the link `sendVerificationEmail` builds in the
 * register/resend routes; this route just hadn't gotten it.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const user = token ? await verifyEmailToken(token) : null;

  const origin = process.env.AUTH_URL ?? new URL(request.url).origin;
  return NextResponse.redirect(
    new URL(user ? "/login?verified=1" : "/login?verified=0", origin),
  );
}

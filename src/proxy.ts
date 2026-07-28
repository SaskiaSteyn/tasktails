import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

/**
 * AUTH-06 — protected routes.
 *
 * This is Next 16's `proxy.ts`; it was called `middleware.ts` up to Next 15 and
 * the file name is the only thing that changed.
 *
 * Everything is protected unless it is listed below. A denylist would mean every
 * new screen ships public until someone remembers to add it — this way the
 * mistake is a locked-out screen you notice immediately, not an exposed one you
 * do not.
 *
 * This check is deliberately *optimistic*: it decodes the session cookie and
 * nothing more. It is a redirect for people who are not signed in, not the
 * authorisation boundary. Every page and route handler still checks the session
 * itself — the proxy is skipped for paths outside the matcher, and server
 * actions are POSTs to whatever route they live on, so a matcher change could
 * silently drop coverage. Never let it be the only gate.
 */
const { auth } = NextAuth(authConfig);

/** Reachable signed out. Everything else redirects to /login. */
const PUBLIC_PATHS = new Set([
  "/", // redirects to /register on its own
  "/login",
  "/register",
  "/style-guide", // the living design reference; no participant data
]);

/**
 * NextAuth's own endpoints — sign-in, sign-out, callbacks, CSRF — plus our
 * register handler, which sits under the same prefix. Locking these would make
 * signing in impossible.
 */
const PUBLIC_API_PREFIX = "/api/auth";

export default auth((request) => {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith(PUBLIC_API_PREFIX)) {
    return NextResponse.next();
  }

  if (request.auth) return NextResponse.next();

  // A fetch() that follows a redirect to an HTML login page reports a confusing
  // parse error rather than "you are signed out", so answer API routes in the
  // shape their callers already handle.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Send people back where they were heading once they sign in; the login page
  // validates this is a same-origin path before using it (AUTH-02).
  const login = new URL("/login", request.nextUrl);
  login.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(login);
});

export const config = {
  // Skip Next's internals and anything that looks like a static asset —
  // without this the proxy runs on CSS, JS and images too.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};

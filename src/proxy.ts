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
  "/", // the marketing site, or the PWA's welcome screen (MKT-01/02/03)
  "/login",
  "/register",
  "/style-guide", // the living design reference; no participant data
  // The web app manifest (`src/app/manifest.ts`). The matcher below exempts
  // static assets by extension but has no `.webmanifest` in its list, so
  // without this the proxy answers it with a redirect to /login — and a
  // manifest the browser cannot read is a PWA that cannot be installed, which
  // is silent: nothing errors, the install option simply never appears. Listed
  // here rather than added to the matcher so it stays one known path, per this
  // file's allowlist-not-denylist rule. No participant data in it.
  "/manifest.webmanifest",
  // The service worker (PWA-02, `public/sw.js`). Same failure mode as the
  // manifest above and for the same reason: the matcher exempts static
  // assets by extension but `.js` isn't in that list, so without this a
  // signed-out visitor's registration attempt gets a `/login` redirect body
  // back instead of a script — `navigator.serviceWorker.register()` rejects
  // on the MIME type, silently, and the worker never installs. Listed here
  // rather than added to the matcher for the same allowlist-not-denylist
  // reason. No participant data in it.
  "/sw.js",
]);

/**
 * NextAuth's own endpoints — sign-in, sign-out, callbacks, CSRF — plus our
 * register handler, which sits under the same prefix. Locking these would make
 * signing in impossible.
 */
const PUBLIC_API_PREFIX = "/api/auth";

/**
 * The origin the browser actually used, which is not `request.nextUrl.origin`
 * (INF-15).
 *
 * Inside a container `nextUrl.origin` is the address the server itself listens
 * on — `http://localhost:3000` — no matter what host the request arrived at. It
 * ignores `Host` and `X-Forwarded-Host` alike, so a signed-out visitor to
 * https://<the study domain>/profile was being redirected to
 * http://localhost:3000/login. Invisible in development, where the two happen to
 * be the same thing.
 *
 * A relative `Location` header would sidestep the question entirely, but Next's
 * proxy layer parses the header as an absolute URL and 500s on a path.
 *
 * Trusting `X-Forwarded-Host` means trusting the proxy in front of this to set
 * it — the same assumption `AUTH_TRUST_HOST` already makes for the deployment.
 * Nothing here redirects anywhere but a fixed path on that origin.
 */
function externalOrigin(request: { headers: Headers; nextUrl: URL }): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;

  const protocol =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");

  return `${protocol}://${host}`;
}

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
  const login = new URL("/login", externalOrigin(request));
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

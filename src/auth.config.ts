import type { NextAuthConfig } from "next-auth";

/**
 * The half of the NextAuth config that touches no database (INF-11, AUTH-06).
 *
 * `src/proxy.ts` builds its own NextAuth instance from this so it can read the
 * session cookie without pulling in the providers or the callbacks — the session
 * callback queries Postgres, and the proxy runs on *every* request including
 * prefetches, so wiring it up there would put a query in front of every
 * navigation. Full config, with providers and callbacks, is in src/auth.ts.
 */
export const authConfig = {
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
} satisfies NextAuthConfig;

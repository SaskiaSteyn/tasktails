import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "@/auth.config";
import {
  authenticate,
  displayNameFor,
  displayNameFromEmail,
  findUserByEmail,
  firstName,
  upsertOAuthUser,
} from "@/lib/users";
import { emailSchema } from "@/lib/validation/auth";

/**
 * NextAuth configuration (INF-11, AUTH-05).
 *
 * The database-free half lives in src/auth.config.ts, which src/proxy.ts builds
 * its own instance from (AUTH-06). Keep anything that queries Postgres — the
 * providers and callbacks below — out of that file.
 *
 * JWT session strategy per AUTH-4/NFR-GEN-4 — sessions survive a refresh without
 * a server-side session table.
 *
 * The A/B study group is deliberately NOT on the session. `/api/auth/session`
 * serves the session to the browser as plain JSON, so anything put there is
 * readable from DevTools — and a participant who learns which arm they are in is
 * a compromised participant. The group lives only in the database; server code
 * reads it through `currentStudyGroup()` in src/lib/study-group.ts. That also
 * satisfies NFR-TASK-3 more strictly: the assignment is never merely asserted by
 * a token the client holds.
 *
 * Google sign-in needs AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in `.env.local`; the
 * button is hidden when they are absent (see `isGoogleEnabled`).
 */

/** True when Google OAuth credentials are configured for this environment. */
export const isGoogleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...(isGoogleEnabled
      ? [
          Google({
            // A fresh consent screen each time keeps account switching easy
            // while participants are being onboarded.
            authorization: { params: { prompt: "select_account" } },
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = emailSchema.safeParse(credentials?.email);
        const password = credentials?.password;

        if (!email.success || typeof password !== "string") return null;

        const user = await authenticate(email.data, password);
        if (!user) return null;

        // No `group` here on purpose — see the note at the top of this file.
        return { id: user.id, email: user.email };
      },
    }),
  ],

  // `session` and `pages` come from authConfig above.

  callbacks: {
    /**
     * Google users have no account record yet on first sign-in, so create one
     * here — that is where their permanent study group is assigned.
     */
    async signIn({ account, user }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        await upsertOAuthUser(user.email, user.name);
      }
      return true;
    },

    async jwt({ token, user }) {
      // `user` is only present on the sign-in pass; afterwards read from the token.
      if (user?.email) {
        const record = await upsertOAuthUser(user.email, user.name);
        token.sub = record.id;
        // Screens greet people by name, so resolve it once here rather than
        // leaving every consumer to fall back off the email itself.
        token.name = displayNameFor(record);
      }
      return token;
    },

    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      // Read the name from the record, not the token: the onboarding name step
      // runs *after* the JWT was issued, and a stale token would keep greeting
      // people by their email until they signed in again. `firstName` on the
      // token is the fallback because NextAuth writes the provider's full name
      // there by default.
      const record = session.user.email
        ? await findUserByEmail(session.user.email)
        : null;

      session.user.name = record
        ? displayNameFor(record)
        : (firstName(token.name) ??
          (session.user.email
            ? displayNameFromEmail(session.user.email)
            : null));
      return session;
    },
  },
});

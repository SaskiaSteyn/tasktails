import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  authenticate,
  displayName,
  displayNameFromEmail,
  findUserByEmail,
  firstName,
  upsertOAuthUser,
  type StudyGroup,
} from "@/lib/mock/users";
import { emailSchema } from "@/lib/validation/auth";

/**
 * NextAuth configuration (INF-11, AUTH-05).
 *
 * JWT session strategy per AUTH-4/NFR-GEN-4 — sessions survive a refresh without
 * a server-side session table. The A/B study group rides on the token so every
 * screen can read it from the session, but it is only ever *written* here on the
 * server (NFR-TASK-3: assignment must be server-enforced).
 *
 * Google sign-in needs AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in `.env.local`; the
 * button is hidden when they are absent (see `isGoogleEnabled`).
 */

/** True when Google OAuth credentials are configured for this environment. */
export const isGoogleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        const user = authenticate(email.data, password);
        if (!user) return null;

        return { id: user.id, email: user.email, group: user.group };
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },

  callbacks: {
    /**
     * Google users have no account record yet on first sign-in, so create one
     * here — that is where their permanent study group is assigned.
     */
    async signIn({ account, user }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        upsertOAuthUser(user.email, user.name);
      }
      return true;
    },

    async jwt({ token, user }) {
      // `user` is only present on the sign-in pass; afterwards read from the token.
      if (user?.email) {
        const record = upsertOAuthUser(user.email, user.name);
        token.sub = record.id;
        token.group = record.group;
        // Screens greet people by name, so resolve it once here rather than
        // leaving every consumer to fall back off the email itself.
        token.name = displayName(record);
      }
      return token;
    },

    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.group) session.user.group = token.group as StudyGroup;
      // Read the name from the record, not the token: the onboarding name step
      // runs *after* the JWT was issued, and a stale token would keep greeting
      // people by their email until they signed in again. `firstName` on the
      // token is the fallback because NextAuth writes the provider's full name
      // there by default.
      const record = session.user.email
        ? findUserByEmail(session.user.email)
        : undefined;

      session.user.name = record
        ? displayName(record)
        : (firstName(token.name) ??
          (session.user.email
            ? displayNameFromEmail(session.user.email)
            : null));
      return session;
    },
  },
});

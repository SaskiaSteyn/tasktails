import type { DefaultSession } from "next-auth";

/**
 * Adds the user id to the session so screens can read `session.user.id` without
 * casting.
 *
 * The study group is deliberately absent. The session is serialised to the
 * browser by `/api/auth/session`, and a participant who can read their arm is a
 * compromised participant — server code reads the group from the database via
 * `currentStudyGroup()` instead (src/lib/study-group.ts).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

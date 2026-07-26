import type { DefaultSession } from "next-auth";

import type { StudyGroup } from "@/lib/mock/users";

/**
 * Adds the study-group assignment and user id to the session/JWT types so screens
 * can read `session.user.group` without casting.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      group: StudyGroup;
    } & DefaultSession["user"];
  }

  interface User {
    group?: StudyGroup;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    group?: StudyGroup;
  }
}

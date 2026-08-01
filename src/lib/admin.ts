import { auth } from "@/auth";
import { UserRole } from "@/generated/prisma/client";
import { findUserById } from "@/lib/users";

/**
 * ADM-09 — the single enforcement point for the admin role.
 *
 * Same reasoning as `currentStudyGroup()` in src/lib/study-group.ts: the role
 * is read from the database on every call rather than trusted off the
 * session/JWT, so it's enforced by the row itself. `/api/admin/*` routes each
 * call this themselves (matching the "every route checks itself" convention
 * `src/proxy.ts` documents) rather than relying on the proxy, which only
 * proves "signed in", never "signed in as admin".
 *
 * SERVER ONLY — imports `auth()` and Prisma (via `findUserById`).
 */
export type AdminGateResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireAdmin(): Promise<AdminGateResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, status: 401, message: "Not signed in." };
  }

  const user = await findUserById(userId);
  if (user?.role !== UserRole.ADMIN) {
    return { ok: false, status: 403, message: "Admin role required." };
  }

  return { ok: true, userId };
}

import { auth } from "@/auth";
import { AbGroup } from "@/generated/prisma/client";
import { findUserByEmail, type StudyGroup } from "@/lib/users";

/**
 * The signed-in participant's A/B arm — the only way to read it (NFR-TASK-3).
 *
 * SERVER ONLY. Never return the result of this to the browser, and never branch
 * on it in a client component: which arm someone is in has to stay invisible to
 * them, or the false-urgency stimuli stop measuring what the study is measuring.
 * Group-dependent markup (STOR-09/STOR-10, URG-01..07) is rendered on the server
 * and the losing branch must never reach the client bundle.
 *
 * Deliberately reads the database rather than the session token: the assignment
 * is then enforced by the row itself, not asserted by a credential the client
 * holds. The group never changes, so there is nothing to cache-invalidate.
 *
 * Returns null when nobody is signed in.
 */
export async function currentStudyGroup(): Promise<StudyGroup | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const record = await findUserByEmail(email);
  return record?.abGroup ?? null;
}

/**
 * The single enforcement point for Group A/B isolation on store data
 * (INF-17, NFR-TASK-3).
 *
 * Store routes that serve Group-B-only content (STOR-09/STOR-10,
 * URG-01..08) call this instead of branching on `currentStudyGroup()`
 * themselves, so there is exactly one place the isolation rule lives.
 * Group A — and anyone signed out — gets `null`; only Group B gets
 * `forGroupB`'s result. Nothing about the request is otherwise blocked:
 * a Group A user still gets a normal response, just without the
 * fabricated urgency data mixed in.
 */
export async function groupGatedData<T>(
  forGroupB: () => T | Promise<T>,
): Promise<T | null> {
  const group = await currentStudyGroup();
  if (group !== AbGroup.B) return null;
  return forGroupB();
}

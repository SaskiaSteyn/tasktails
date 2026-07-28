import { auth } from "@/auth";
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

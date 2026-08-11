import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { onboardingStatus } from "@/lib/onboarding";

/**
 * ONB-03 — `GET /api/onboarding`. Returns the authenticated user's live
 * status on the three onboarding quests.
 *
 * Neither `/onboarding` (ONB-01's checklist) nor `/tasks`'s `NextQuestCard`
 * calls this — both are server components that read `onboardingStatus()`
 * directly, same reasoning `/api/tasks`'s own GET documents for
 * `tasksForUser()`. This route exists for whichever client-side consumer
 * needs to re-fetch without a full page navigation; there is none yet.
 *
 * Same auth pattern as every other route here: checked explicitly rather
 * than relied on from `src/proxy.ts`, which only gates page navigations.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const onboarding = await onboardingStatus(userId);
  return NextResponse.json({ onboarding });
}

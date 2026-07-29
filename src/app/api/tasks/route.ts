import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { tasksForUser } from "@/lib/tasks";

/**
 * TASK-07 — `GET /api/tasks`, the authenticated user's task list.
 *
 * TASK-01's dashboard reads `tasksForUser()` directly (a server component,
 * no network hop needed) rather than calling this — this route is the read
 * half of the resource TASK-08..11 write to, for whichever client-side
 * consumer eventually needs to re-fetch after a mutation.
 *
 * Same auth pattern as `src/app/api/user/username/route.ts`: checked here
 * explicitly rather than relied on from `src/proxy.ts`, which is a redirect
 * for page navigations, not the authorisation boundary for API routes.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const tasks = await tasksForUser(userId);
  return NextResponse.json({ tasks });
}

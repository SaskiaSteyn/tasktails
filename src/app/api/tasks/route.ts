import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createTask, tasksForUser } from "@/lib/tasks";
import { createTaskSchema, fieldErrors } from "@/lib/validation/tasks";

/**
 * TASK-07/TASK-08 — `/api/tasks`. `GET` lists the authenticated user's
 * tasks, `POST` creates one.
 *
 * TASK-01's dashboard reads `tasksForUser()` directly (a server component,
 * no network hop needed) rather than calling `GET` — that route exists for
 * whichever client-side consumer needs to re-fetch after a mutation. `POST`
 * does have a real consumer already: TASK-02's create-task sheet, wired to
 * this the same day it shipped.
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

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request body." },
      { status: 400 },
    );
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const task = await createTask(userId, {
    title: parsed.data.title,
    complexityTier: parsed.data.complexityTier,
    dueDate: parsed.data.dueDate ?? null,
  });

  return NextResponse.json({ task }, { status: 201 });
}

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { updateTask } from "@/lib/tasks";
import { createTaskSchema, fieldErrors } from "@/lib/validation/tasks";

/**
 * TASK-09 — `PATCH /api/tasks/[id]`. Edits title, due date, or complexity.
 *
 * Reuses `createTaskSchema` — TASK-03's edit form sends the same three
 * fields TASK-02's create sheet does, validated the same way. `updateTask()`
 * scopes the write to the owner; a task id that's someone else's 404s the
 * same way one that doesn't exist does, not a 403 that would confirm the id
 * was real (same reasoning as `taskForUser()`, TASK-03's page load).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const task = await updateTask(userId, id, {
    title: parsed.data.title,
    complexityTier: parsed.data.complexityTier,
    dueDate: parsed.data.dueDate ?? null,
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ task });
}

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createSubtask } from "@/lib/tasks";
import { createSubtaskSchema, fieldErrors } from "@/lib/validation/tasks";

/**
 * SUB-04 — `POST /api/tasks/[id]/subtasks`. Adds a subtask to a task.
 *
 * 404s rather than 403s when the task id belongs to someone else or doesn't
 * exist — same reasoning as `/api/tasks/[id]` (TASK-09/10): the response
 * can't confirm the id was ever real.
 */
export async function POST(
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

  const parsed = createSubtaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { id } = await params;
  const subtask = await createSubtask(userId, id, parsed.data.title);

  if (!subtask) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ subtask }, { status: 201 });
}

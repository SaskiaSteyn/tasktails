import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteTask, updateTask } from "@/lib/tasks";
import { createTaskSchema, fieldErrors } from "@/lib/validation/tasks";

/**
 * TASK-09/TASK-10 — `/api/tasks/[id]`. `PATCH` edits title, due date, or
 * complexity; `DELETE` removes the task (and, by the schema's cascade, its
 * subtasks).
 *
 * Both scope their write to the owner (`updateTask()`/`deleteTask()`) and
 * 404 rather than 403 when a task id belongs to someone else, so the
 * response can't confirm the id was ever real (same reasoning as
 * `taskForUser()`, TASK-03's page load).
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteTask(userId, id);

  if (!deleted) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

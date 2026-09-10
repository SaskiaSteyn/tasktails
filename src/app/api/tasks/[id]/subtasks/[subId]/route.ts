import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteSubtask, renameSubtask, taskForUser } from "@/lib/tasks";
import { createSubtaskSchema, fieldErrors } from "@/lib/validation/tasks";

/**
 * #273 — `/api/tasks/[id]/subtasks/[subId]`. `PATCH` retitles a subtask,
 * `DELETE` removes it. SUB-04 shipped the add and SUB-05 the completion;
 * neither gave a subtask a way back out once it existed.
 *
 * Ownership is checked by loading the parent through `taskForUser()` first
 * — `Subtask` has no `userId` column, so there is nothing to scope a single
 * write by. 404 rather than 403 for a task or subtask that isn't the
 * caller's, same reasoning as every other route under `/api/tasks/[id]`:
 * the response must not confirm the id was ever real.
 *
 * `DELETE` refuses a subtask that is already complete (409). That is an
 * economy rule, not squeamishness — see `deleteSubtask()`'s comment for the
 * arithmetic. It also lines up with the forward-only rule TASK-11 and
 * SUB-05 already enforce: a completion is not undoable, and deleting the
 * row it lives on would be the back door.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; subId: string }> },
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

  // Same "trim, require non-empty" rule the add path already applies, so a
  // rename cannot put a title into the row that the add would have rejected.
  const parsed = createSubtaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { id: taskId, subId } = await params;

  const task = await taskForUser(userId, taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const subtask = await renameSubtask(taskId, subId, parsed.data.title);
  if (!subtask) {
    return NextResponse.json({ error: "Subtask not found." }, { status: 404 });
  }

  return NextResponse.json({ subtask });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; subId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: taskId, subId } = await params;

  const task = await taskForUser(userId, taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const subtask = task.subtasks.find((candidate) => candidate.id === subId);
  if (!subtask) {
    return NextResponse.json({ error: "Subtask not found." }, { status: 404 });
  }
  // The real guard is `deleteSubtask()`'s where clause; this is the readable
  // path to a message the form can show, same split as SUB-05's route.
  if (subtask.completedAt) {
    return NextResponse.json(
      { error: "A finished subtask can't be deleted." },
      { status: 409 },
    );
  }

  const deleted = await deleteSubtask(taskId, subId);
  if (!deleted) {
    return NextResponse.json(
      { error: "A finished subtask can't be deleted." },
      { status: 409 },
    );
  }

  return new NextResponse(null, { status: 204 });
}

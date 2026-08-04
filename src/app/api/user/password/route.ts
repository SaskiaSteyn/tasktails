import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { changePassword, IncorrectPasswordError } from "@/lib/users";
import { changePasswordSchema, fieldErrors } from "@/lib/validation/auth";

/**
 * PRO-12 — `POST /api/user/password`. Verifies the current password and
 * stores the new hash. The account comes from the session, not the body —
 * same reasoning as every other `/api/user/*` route this session: a
 * participant must not be able to name someone else's account.
 */
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

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const user = await changePassword(
      userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof IncorrectPasswordError) {
      return NextResponse.json(
        { fieldErrors: { currentPassword: error.message } },
        { status: 401 },
      );
    }
    throw error;
  }
}

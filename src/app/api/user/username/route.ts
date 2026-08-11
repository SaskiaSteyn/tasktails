import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  isUsernameAvailable,
  setUsername,
  UsernameTakenError,
} from "@/lib/users";
import { fieldErrors, usernameSchema } from "@/lib/validation/auth";

/**
 * Username endpoints (ONB-04/ONB-05, AUTH-07).
 *
 * `PUT` claims a handle, `POST` only reports whether one is free — the
 * debounced check behind the availability line on the username step.
 *
 * Both read the account from the session, never from the body: a participant
 * must not be able to rename someone else. The check is a POST rather than a
 * GET so a handle never lands in a URL, a query log or a Referer header.
 */

async function parse(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return { error: "unauthorised" } as const;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "malformed" } as const;
  }

  const parsed = usernameSchema.safeParse(body);
  if (!parsed.success) return { error: "invalid", issues: parsed.error } as const;

  return { email: session.user.email, username: parsed.data.username } as const;
}

export async function POST(request: Request) {
  const result = await parse(request);

  if ("error" in result) {
    if (result.error === "unauthorised") {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (result.error === "invalid") {
      return NextResponse.json(
        { available: false, fieldErrors: fieldErrors(result.issues) },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Malformed request body." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    username: result.username,
    available: await isUsernameAvailable(result.username, result.email),
  });
}

export async function PUT(request: Request) {
  const result = await parse(request);

  if ("error" in result) {
    if (result.error === "unauthorised") {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    if (result.error === "invalid") {
      return NextResponse.json(
        { fieldErrors: fieldErrors(result.issues) },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Malformed request body." },
      { status: 400 },
    );
  }

  try {
    const user = await setUsername(result.email, result.username);
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    return NextResponse.json({ username: user.username });
  } catch (error) {
    if (error instanceof UsernameTakenError) {
      return NextResponse.json(
        { fieldErrors: { username: error.message } },
        { status: 409 },
      );
    }
    throw error;
  }
}

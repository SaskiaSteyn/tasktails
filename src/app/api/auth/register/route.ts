import { NextResponse } from "next/server";

import { createUser, EmailInUseError } from "@/lib/users";
import { fieldErrors, registerSchema } from "@/lib/validation/auth";

/**
 * `POST /api/auth/register` (AUTH-04).
 *
 * Creates the account, hashes the password, assigns the random A/B group and
 * initialises the `UserEconomy` record — the last three all inside
 * `createUser`, so an account can never exist half-built.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request body." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const user = await createUser(parsed.data.email, parsed.data.password);

    // The group is deliberately not returned — participants must not learn their
    // assignment, and the study screens read it from the session instead.
    return NextResponse.json(
      { user: { id: user.id, email: user.email } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof EmailInUseError) {
      return NextResponse.json(
        { fieldErrors: { email: error.message } },
        { status: 409 },
      );
    }
    throw error;
  }
}

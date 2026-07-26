import { NextResponse } from "next/server";

import { createUser, EmailInUseError } from "@/lib/mock/users";
import { fieldErrors, registerSchema } from "@/lib/validation/auth";

/**
 * MOCK `POST /api/auth/register` (AUTH-04).
 *
 * Creates the account, hashes the password, assigns the random A/B group and
 * initialises the economy record — all against the in-memory store in
 * `@/lib/mock/users`. Replace that module with Prisma calls when INF-01 lands;
 * this handler should not need to change.
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
    const user = createUser(parsed.data.email, parsed.data.password);

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

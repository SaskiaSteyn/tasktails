import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { settingsForUser, updateSettings } from "@/lib/settings";
import { updateSettingsSchema } from "@/lib/validation/settings";

/**
 * PRO-15 — `GET`/`PATCH /api/user/settings`. `GET` is what a client-side
 * consumer would read from (the Settings page itself reads
 * `settingsForUser()` directly, server-side, same pattern as PRO-05/08).
 * `PATCH` is what PRO-13/14's toggles call, one field at a time.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const settings = await settingsForUser(userId);
  if (!settings) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
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

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings patch." },
      { status: 400 },
    );
  }

  const settings = await updateSettings(userId, parsed.data);
  return NextResponse.json(settings);
}

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { markLuckyBoxRevealed } from "@/lib/gacha";

/**
 * The reveal calls this once every card is turned, so My boxes stops
 * offering to continue the box. Idempotent — a repeat is a no-op 200.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  await markLuckyBoxRevealed(userId, id);
  return NextResponse.json({ ok: true });
}

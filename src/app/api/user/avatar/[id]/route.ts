import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { findUserById } from "@/lib/users";

/**
 * `GET /api/user/avatar/:id` — one account's photo as an image, the URL
 * `avatarSrc()` hands to every `<img>`. Signed-in only, the same audience that
 * sees avatars on the leaderboard today.
 *
 * Cached for a year: `avatarSrc()` puts a content hash in `?v=`, so a new
 * upload is a new URL. `private` keeps it out of shared caches.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const user = await findUserById((await params).id);
  const match = user?.avatarUrl?.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) {
    return NextResponse.json({ error: "No photo." }, { status: 404 });
  }

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

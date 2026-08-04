import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { setAvatar } from "@/lib/users";
import { MAX_AVATAR_BYTES, sniffImageType } from "@/lib/validation/avatar";

/**
 * PRO-03 — `POST /api/user/avatar`. Multipart, not JSON: the body is the raw
 * image file under the `avatar` field, uploaded by PRO-02's picker.
 *
 * Stored as a base64 data URL on `User.avatarUrl` rather than a file on disk —
 * see `src/lib/validation/avatar.ts` for why the deployed container can't do
 * the latter.
 */
export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Malformed request body." },
      { status: 400 },
    );
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "That image is empty." }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "Image must be 3 MB or smaller." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageType(bytes);
  if (!mime) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, GIF or WEBP image." },
      { status: 400 },
    );
  }

  const dataUrl = `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;

  const user = await setAvatar(email, dataUrl);
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  return NextResponse.json({ avatarUrl: user.avatarUrl });
}

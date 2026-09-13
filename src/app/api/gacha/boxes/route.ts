import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { LuckyBoxKey } from "@/generated/prisma/client";
import { snapshotOf } from "@/lib/economy";
import { buyLuckyBox } from "@/lib/gacha";
import { LUCKY_BOXES } from "@/lib/lucky-boxes";

/**
 * Buys one Lucky Box — body `{ key }`. The price comes from `lucky-boxes.ts`,
 * never the client, and the account from the session. The box lands unopened
 * in My boxes; nothing is rolled until `/api/gacha/boxes/[id]/open`.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const key = body?.key as LuckyBoxKey | undefined;
  if (!LUCKY_BOXES.some((box) => box.key === key)) {
    return NextResponse.json({ error: "Unknown box." }, { status: 400 });
  }

  const result = await buyLuckyBox(userId, key!);

  if (!result.ok) {
    if (result.reason === "no-account") {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }
    // 409 rather than 402 — same reasoning buy-xp's route documents.
    return NextResponse.json(
      {
        error: `You need ${result.shortfall.toLocaleString("en-US")} more coins.`,
        code: result.reason,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    boxId: result.boxId,
    economy: snapshotOf(result.economy),
  });
}

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { addToCart, cartForUser } from "@/lib/cart";
import { addToCartSchema, fieldErrors } from "@/lib/validation/store";

/**
 * STOR-13 — `GET /api/store/cart`. Lists the signed-in user's current cart,
 * each row with its catalogue item attached (`cartForUser()`).
 *
 * Same auth pattern as `GET /api/tasks`: checked here explicitly rather than
 * relied on from `src/proxy.ts`.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const cart = await cartForUser(userId);
  return NextResponse.json({ cart });
}

/**
 * STOR-12 — `POST /api/store/cart`. Adds an item to the signed-in user's
 * cart, growing the existing line if it's already there (`addToCart()`).
 *
 * Same request/response shape convention as `POST /api/tasks`: 400 with
 * `fieldErrors` on a malformed body, 401 signed out, 404 when the item id
 * doesn't exist, 201 with the resulting row on success. 403 is new here —
 * the item exists but is locked at the user's current level (STOR-04's
 * card), same reasoning `buy-xp`'s 409 documents for "well-formed request,
 * just not entitled to it right now".
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

  const parsed = addToCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const result = await addToCart(
    userId,
    parsed.data.storeItemId,
    parsed.data.quantity,
  );

  if (!result.ok) {
    if (result.reason === "not-found") {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: `Requires Level ${result.levelRequired}.`,
        code: result.reason,
        levelRequired: result.levelRequired,
        level: result.level,
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ cartItem: result.cartItem }, { status: 201 });
}

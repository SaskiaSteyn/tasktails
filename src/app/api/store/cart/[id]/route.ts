import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { removeFromCart, updateCartItemQuantity } from "@/lib/cart";
import { fieldErrors, updateCartItemSchema } from "@/lib/validation/store";

/**
 * STOR-14 — `PATCH /api/store/cart/[id]`. Sets a cart row's quantity.
 *
 * Same shape/scoping convention as `PATCH /api/tasks/[id]`: 400 with
 * `fieldErrors` on a malformed body, 401 signed out, 404 when the id doesn't
 * exist or belongs to someone else (`updateCartItemQuantity()`'s scoped
 * `updateMany` can't tell those apart, deliberately).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const parsed = updateCartItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { id } = await params;
  const cartItem = await updateCartItemQuantity(userId, id, parsed.data.quantity);

  if (!cartItem) {
    return NextResponse.json({ error: "Cart item not found." }, { status: 404 });
  }

  return NextResponse.json({ cartItem });
}

/**
 * STOR-15 — `DELETE /api/store/cart/[id]`. Removes one row from the
 * signed-in user's cart. Same shape convention as `DELETE /api/tasks/[id]`:
 * 401 signed out, 404 when the id doesn't exist or belongs to someone else,
 * 204 on success.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const removed = await removeFromCart(userId, id);

  if (!removed) {
    return NextResponse.json({ error: "Cart item not found." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

import { z } from "zod";

/** STOR-12 — `POST /api/store/cart`'s body. */
export const addToCartSchema = z.object({
  storeItemId: z.string().trim().min(1, "Pick an item."),
  /** Defaults to 1 — most add-to-cart taps don't specify a quantity. */
  quantity: z.number().int().min(1, "Quantity must be at least 1.").default(1),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

/**
 * STOR-14 — `PATCH /api/store/cart/[id]`'s body. No `default` here (unlike
 * `addToCartSchema`) — an edit with no quantity given is a malformed request,
 * not an implicit "set to 1".
 */
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1."),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export { fieldErrors } from "@/lib/validation/auth";

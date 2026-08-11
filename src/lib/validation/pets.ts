import { z } from "zod";

/**
 * PET-08's `POST /api/pets/[id]/feed` body — which inventory row to feed
 * with. Ownership/category/stock are `recordFeedInteraction()`'s job
 * (`consumeFoodItem()` in `src/lib/inventory.ts`); this only rejects a
 * missing or empty id before that even runs.
 */
export const feedPetSchema = z.object({
  inventoryItemId: z.string().trim().min(1, "Pick a food item."),
});

export type FeedPetInput = z.infer<typeof feedPetSchema>;

/**
 * PET-09's `POST /api/pets/[id]/customize` body — same shape as
 * `feedPetSchema`, one field picking which inventory row to act on.
 * Ownership/category are `recordCustomizeInteraction()`'s job
 * (`equipAccessory()` in `src/lib/inventory.ts`).
 */
export const customizePetSchema = z.object({
  inventoryItemId: z.string().trim().min(1, "Pick an accessory."),
});

export type CustomizePetInput = z.infer<typeof customizePetSchema>;

/**
 * `POST /api/pets/[id]/rename` — the pet's own nickname, separate from
 * `storeItem.name` (the shared species name every pet of that type starts
 * with). Capped at 30 so it never overruns "Customize {name}" in the header.
 */
export const renamePetSchema = z.object({
  name: z.string().trim().min(1, "Give your pet a name.").max(30, "Keep it under 30 characters."),
});

export type RenamePetInput = z.infer<typeof renamePetSchema>;

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPetForTransaction,
  petForUser,
  petsForUser,
  recordCustomizeInteraction,
  recordFeedInteraction,
  recordPetInteraction,
  recordUnequipInteraction,
} from "@/lib/pets";
import { prismaMock } from "@/test/prisma-mock";
import type { PetWithItem } from "@/lib/pets";
import type { InventoryItemWithStoreItem } from "@/lib/inventory";
import type { StoreItem } from "@/generated/prisma/client";

/**
 * PET-06/PET-07/PET-10 — `petsForUser()`/`petForUser()` decay their stored
 * `happiness`/`hunger` for `now` on every read (a regression test for a real
 * bug: leaving those two undecayed while `recordPetInteraction()` decayed
 * for real made a single "Pet" click look like it lowered happiness and
 * raised hunger, since the displayed stale number jumped straight to the
 * true decayed-then-boosted one). `recordPetInteraction()` does the same
 * catch-up before applying its own +7 happiness boost.
 *
 * `@/auth` is mocked because `economy.ts` (imported transitively via
 * `pets.ts`'s `incrementPetInteractionCount`/`incrementFeedInteractionCount`)
 * imports it for `currentEconomy`; nothing here signs in. Same pattern as
 * economy.test.ts/achievements.test.ts.
 */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const at = (hour: number, minute = 0) => new Date(2026, 6, 20, hour, minute);

function petRow(overrides: Partial<PetWithItem> = {}): PetWithItem {
  return {
    id: "pet-1",
    userId: "user-1",
    storeItemId: "item-1",
    happiness: 60,
    hunger: 40,
    lastInteractedAt: at(12),
    storeItem: {
      id: "item-1",
      name: "Koala kit",
      category: "ANIMALS",
      levelRequired: 1,
      coinPrice: 5,
      imageUrl: "/animals/happy/koala.svg",
    },
    ...overrides,
  } as PetWithItem;
}

function foodRow(
  overrides: Partial<InventoryItemWithStoreItem> = {},
): InventoryItemWithStoreItem {
  return {
    id: "item-1",
    userId: "user-1",
    storeItemId: "food-1",
    equippedToPetId: null,
    quantity: 3,
    storeItem: {
      id: "food-1",
      name: "Sunflower seeds",
      category: "FOOD",
      levelRequired: 1,
      coinPrice: 5,
      imageUrl: "wheat",
    },
    ...overrides,
  } as InventoryItemWithStoreItem;
}

function accessoryRow(
  overrides: Partial<InventoryItemWithStoreItem> = {},
): InventoryItemWithStoreItem {
  return {
    id: "acc-1",
    userId: "user-1",
    storeItemId: "collar-1",
    equippedToPetId: null,
    quantity: 1,
    storeItem: {
      id: "collar-1",
      name: "Red collar",
      category: "ACCESSORIES",
      levelRequired: 1,
      coinPrice: 30,
      imageUrl: "circle",
    },
    ...overrides,
  } as InventoryItemWithStoreItem;
}

function decorationRow(
  overrides: Partial<InventoryItemWithStoreItem> = {},
): InventoryItemWithStoreItem {
  return {
    id: "decor-1",
    userId: "user-1",
    storeItemId: "river-1",
    equippedToPetId: null,
    quantity: 1,
    storeItem: {
      id: "river-1",
      name: "Mona Lisa (fox logo)",
      category: "DECORATIONS",
      levelRequired: 17,
      coinPrice: 3200,
      imageUrl: "/backgrounds/river.svg",
    },
    ...overrides,
  } as InventoryItemWithStoreItem;
}

describe("petsForUser / petForUser", () => {
  it("decays happiness/hunger for `now` rather than returning the stored row as-is", async () => {
    const pet = petRow({ lastInteractedAt: at(12) });
    prismaMock.pet.findMany.mockResolvedValue([pet]);
    prismaMock.pet.findFirst.mockResolvedValue(pet);

    const now = at(15);
    const [listed] = await petsForUser("user-1", now);
    const single = await petForUser("user-1", "pet-1", now);

    // Same 3h-elapsed math as `recordPetInteraction`'s test below.
    expect(listed).toMatchObject({ happiness: 48, hunger: 55 });
    expect(single).toMatchObject({ happiness: 48, hunger: 55 });
  });

  it("never writes to the database — decay is read-only", async () => {
    prismaMock.pet.findMany.mockResolvedValue([petRow()]);

    await petsForUser("user-1", at(12));

    expect(prismaMock.pet.update).not.toHaveBeenCalled();
  });
});

describe("recordPetInteraction", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
  });

  it("boosts happiness by 7 and leaves hunger unchanged with no elapsed time", async () => {
    const pet = petRow();
    prismaMock.pet.findFirst.mockResolvedValue(pet);
    prismaMock.pet.update.mockImplementation(
      (args) => Promise.resolve({ ...pet, ...(args.data as object) }) as never,
    );

    const now = at(12);
    await recordPetInteraction("user-1", "pet-1", now);

    expect(prismaMock.pet.update).toHaveBeenCalledWith({
      where: { id: "pet-1" },
      data: { happiness: 67, hunger: 40, lastInteractedAt: now, timesPetted: { increment: 1 } },
      include: { storeItem: true },
    });
  });

  it("catches decay up to `now` before applying the boost", async () => {
    // 3h elapsed since lastInteractedAt: −12 happiness, +15 hunger.
    const pet = petRow({ lastInteractedAt: at(12) });
    prismaMock.pet.findFirst.mockResolvedValue(pet);
    prismaMock.pet.update.mockImplementation(
      (args) => Promise.resolve({ ...pet, ...(args.data as object) }) as never,
    );

    const now = at(15);
    await recordPetInteraction("user-1", "pet-1", now);

    // 60 − 12 = 48, + boost 7 = 55. Hunger 40 + 15 = 55, unchanged by petting.
    expect(prismaMock.pet.update).toHaveBeenCalledWith({
      where: { id: "pet-1" },
      data: { happiness: 55, hunger: 55, lastInteractedAt: now, timesPetted: { increment: 1 } },
      include: { storeItem: true },
    });
  });

  it("clamps the boosted happiness at 100", async () => {
    const pet = petRow({ happiness: 96, lastInteractedAt: at(12) });
    prismaMock.pet.findFirst.mockResolvedValue(pet);
    prismaMock.pet.update.mockImplementation(
      (args) => Promise.resolve({ ...pet, ...(args.data as object) }) as never,
    );

    await recordPetInteraction("user-1", "pet-1", at(12));

    expect(prismaMock.pet.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ happiness: 100 }) }),
    );
  });

  it("returns null and never writes when the pet isn't the caller's", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(null);

    const result = await recordPetInteraction("user-1", "someone-elses-pet", at(12));

    expect(result).toBeNull();
    expect(prismaMock.pet.update).not.toHaveBeenCalled();
  });
});

describe("recordFeedInteraction", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
  });

  it("consumes the item and applies −18 hunger / +4 happiness with no elapsed time", async () => {
    const pet = petRow();
    const item = foodRow();
    prismaMock.pet.findFirst.mockResolvedValue(pet);
    prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.inventoryItem.findUniqueOrThrow.mockResolvedValue({
      ...item,
      quantity: item.quantity - 1,
    } as never);
    prismaMock.pet.update.mockImplementation(
      (args) => Promise.resolve({ ...pet, ...(args.data as object) }) as never,
    );

    const now = at(12);
    const result = await recordFeedInteraction("user-1", "pet-1", "item-1", now);

    expect(prismaMock.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: "item-1",
        userId: "user-1",
        quantity: { gt: 0 },
        storeItem: { category: "FOOD" },
      },
      data: { quantity: { decrement: 1 } },
    });
    expect(prismaMock.pet.update).toHaveBeenCalledWith({
      where: { id: "pet-1" },
      data: { happiness: 64, hunger: 22, lastInteractedAt: now },
      include: { storeItem: true },
    });
    expect(result).toEqual({
      ok: true,
      pet: expect.objectContaining({ happiness: 64, hunger: 22 }),
      item: expect.objectContaining({ quantity: 2 }),
    });
  });

  it("catches decay up to `now` before applying the feed deltas", async () => {
    // 3h elapsed: happiness 60 − 12 = 48, hunger 40 + 15 = 55.
    const pet = petRow({ lastInteractedAt: at(12) });
    prismaMock.pet.findFirst.mockResolvedValue(pet);
    prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.inventoryItem.findUniqueOrThrow.mockResolvedValue(foodRow() as never);
    prismaMock.pet.update.mockImplementation(
      (args) => Promise.resolve({ ...pet, ...(args.data as object) }) as never,
    );

    const now = at(15);
    await recordFeedInteraction("user-1", "pet-1", "item-1", now);

    // 48 + 4 = 52 happiness. 55 − 18 = 37 hunger.
    expect(prismaMock.pet.update).toHaveBeenCalledWith({
      where: { id: "pet-1" },
      data: { happiness: 52, hunger: 37, lastInteractedAt: now },
      include: { storeItem: true },
    });
  });

  it("clamps hunger at 0", async () => {
    const pet = petRow({ hunger: 10, lastInteractedAt: at(12) });
    prismaMock.pet.findFirst.mockResolvedValue(pet);
    prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.inventoryItem.findUniqueOrThrow.mockResolvedValue(foodRow() as never);
    prismaMock.pet.update.mockImplementation(
      (args) => Promise.resolve({ ...pet, ...(args.data as object) }) as never,
    );

    await recordFeedInteraction("user-1", "pet-1", "item-1", at(12));

    expect(prismaMock.pet.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ hunger: 0 }) }),
    );
  });

  it("clamps happiness at 100", async () => {
    const pet = petRow({ happiness: 98, lastInteractedAt: at(12) });
    prismaMock.pet.findFirst.mockResolvedValue(pet);
    prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.inventoryItem.findUniqueOrThrow.mockResolvedValue(foodRow() as never);
    prismaMock.pet.update.mockImplementation(
      (args) => Promise.resolve({ ...pet, ...(args.data as object) }) as never,
    );

    await recordFeedInteraction("user-1", "pet-1", "item-1", at(12));

    expect(prismaMock.pet.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ happiness: 100 }) }),
    );
  });

  it("returns pet-not-found and never touches inventory when the pet isn't the caller's", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(null);

    const result = await recordFeedInteraction("user-1", "someone-elses-pet", "item-1", at(12));

    expect(result).toEqual({ ok: false, reason: "pet-not-found" });
    expect(prismaMock.inventoryItem.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.pet.update).not.toHaveBeenCalled();
  });

  it("returns item-not-found and never updates the pet when the item can't be consumed", async () => {
    // Not owned, not food, or already at 0 all look identical: updateMany matches nothing.
    prismaMock.pet.findFirst.mockResolvedValue(petRow());
    prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

    const result = await recordFeedInteraction("user-1", "pet-1", "not-mine", at(12));

    expect(result).toEqual({ ok: false, reason: "item-not-found" });
    expect(prismaMock.pet.update).not.toHaveBeenCalled();
  });
});

describe("recordCustomizeInteraction", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
  });

  it("equips the item and unequips whatever this pet had on before in the same category", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(petRow());
    prismaMock.inventoryItem.findFirst.mockResolvedValue(accessoryRow());
    prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.inventoryItem.update.mockResolvedValue(
      accessoryRow({ equippedToPetId: "pet-1" }) as never,
    );

    const result = await recordCustomizeInteraction("user-1", "pet-1", "acc-1");

    expect(prismaMock.inventoryItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: "acc-1",
        userId: "user-1",
        storeItem: { category: { in: ["ACCESSORIES", "DECORATIONS"] } },
      },
      include: { storeItem: true },
    });
    // Displaces whatever *this pet* already had on in the *same category*
    // (ACCESSORIES, from the found item's own `storeItem.category`), but
    // never the item being equipped itself, and never the other category's
    // item — a background stays on while an accessory is (un)equipped.
    expect(prismaMock.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: { equippedToPetId: "pet-1", id: { not: "acc-1" }, storeItem: { category: "ACCESSORIES" } },
      data: { equippedToPetId: null },
    });
    expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { equippedToPetId: "pet-1" },
      include: { storeItem: true },
    });
    expect(result).toEqual({
      ok: true,
      item: expect.objectContaining({ equippedToPetId: "pet-1" }),
    });
  });

  it("equips a decoration, scoping the unequip to DECORATIONS rather than ACCESSORIES", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(petRow());
    prismaMock.inventoryItem.findFirst.mockResolvedValue(decorationRow());
    prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.inventoryItem.update.mockResolvedValue(
      decorationRow({ equippedToPetId: "pet-1" }) as never,
    );

    const result = await recordCustomizeInteraction("user-1", "pet-1", "decor-1");

    expect(prismaMock.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        equippedToPetId: "pet-1",
        id: { not: "decor-1" },
        storeItem: { category: "DECORATIONS" },
      },
      data: { equippedToPetId: null },
    });
    expect(result).toEqual({
      ok: true,
      item: expect.objectContaining({ equippedToPetId: "pet-1" }),
    });
  });

  it("returns pet-not-found and never touches inventory when the pet isn't the caller's", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(null);

    const result = await recordCustomizeInteraction("user-1", "someone-elses-pet", "acc-1");

    expect(result).toEqual({ ok: false, reason: "pet-not-found" });
    expect(prismaMock.inventoryItem.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.inventoryItem.update).not.toHaveBeenCalled();
  });

  it("returns item-not-found and never unequips or writes when the item isn't the caller's", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(petRow());
    prismaMock.inventoryItem.findFirst.mockResolvedValue(null);

    const result = await recordCustomizeInteraction("user-1", "pet-1", "not-mine");

    expect(result).toEqual({ ok: false, reason: "item-not-found" });
    // Ownership is checked *before* anything is written — a bad item id
    // must not first strip the pet's current one.
    expect(prismaMock.inventoryItem.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.inventoryItem.update).not.toHaveBeenCalled();
  });

  it("returns item-not-found for a FOOD item — only ACCESSORIES/DECORATIONS are equippable", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(petRow());
    // A real `findFirst` filtered on `category: { in: [...] }` would never
    // match a FOOD row in the first place — `null` is what the mock stands
    // in for that non-match, same as the "not-mine" case above.
    prismaMock.inventoryItem.findFirst.mockResolvedValue(null);

    const result = await recordCustomizeInteraction("user-1", "pet-1", "food-1");

    expect(result).toEqual({ ok: false, reason: "item-not-found" });
  });
});

describe("recordUnequipInteraction", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock) as never,
    );
  });

  it("clears equippedToPetId for the item this pet currently has on", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(petRow());
    prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.inventoryItem.findUniqueOrThrow.mockResolvedValue(
      accessoryRow({ equippedToPetId: null }) as never,
    );

    const result = await recordUnequipInteraction("user-1", "pet-1", "acc-1");

    expect(prismaMock.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: "acc-1",
        userId: "user-1",
        equippedToPetId: "pet-1",
        storeItem: { category: { in: ["ACCESSORIES", "DECORATIONS"] } },
      },
      data: { equippedToPetId: null },
    });
    expect(result).toEqual({
      ok: true,
      item: expect.objectContaining({ equippedToPetId: null }),
    });
  });

  it("returns item-not-found when the item wasn't equipped to this pet", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(petRow());
    prismaMock.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

    const result = await recordUnequipInteraction("user-1", "pet-1", "acc-1");

    expect(result).toEqual({ ok: false, reason: "item-not-found" });
    expect(prismaMock.inventoryItem.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("returns pet-not-found and never touches inventory when the pet isn't the caller's", async () => {
    prismaMock.pet.findFirst.mockResolvedValue(null);

    const result = await recordUnequipInteraction("user-1", "someone-elses-pet", "acc-1");

    expect(result).toEqual({ ok: false, reason: "pet-not-found" });
    expect(prismaMock.inventoryItem.updateMany).not.toHaveBeenCalled();
  });
});

describe("createPetForTransaction", () => {
  const animalStoreItem = {
    id: "koala-1",
    name: "Koala kit",
    category: "ANIMALS",
    levelRequired: 1,
    coinPrice: 5,
    imageUrl: "/animals/happy/koala.svg",
  } as StoreItem;

  it("creates a Pet at full happiness and zero hunger for an ANIMALS item", async () => {
    prismaMock.pet.create.mockImplementation(
      (args) =>
        Promise.resolve({
          id: "new-pet",
          ...(args.data as object),
        }) as never,
    );

    const now = at(12);
    const pet = await createPetForTransaction(prismaMock, "user-1", animalStoreItem, now);

    expect(prismaMock.pet.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        storeItemId: "koala-1",
        happiness: 100,
        hunger: 0,
        lastInteractedAt: now,
      },
      include: { storeItem: true },
    });
    expect(pet).toMatchObject({ happiness: 100, hunger: 0 });
  });

  it.each(["FOOD", "ACCESSORIES", "DECORATIONS"] as const)(
    "does nothing for a %s item",
    async (category) => {
      const result = await createPetForTransaction(
        prismaMock,
        "user-1",
        { ...animalStoreItem, category },
        at(12),
      );

      expect(result).toBeNull();
      expect(prismaMock.pet.create).not.toHaveBeenCalled();
    },
  );
});

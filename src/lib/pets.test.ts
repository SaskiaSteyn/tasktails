import { describe, expect, it } from "vitest";

import { petForUser, petsForUser, recordPetInteraction } from "@/lib/pets";
import { prismaMock } from "@/test/prisma-mock";
import type { PetWithItem } from "@/lib/pets";

/**
 * PET-06/PET-07/PET-10 — `petsForUser()`/`petForUser()` decay their stored
 * `happiness`/`hunger` for `now` on every read (a regression test for a real
 * bug: leaving those two undecayed while `recordPetInteraction()` decayed
 * for real made a single "Pet" click look like it lowered happiness and
 * raised hunger, since the displayed stale number jumped straight to the
 * true decayed-then-boosted one). `recordPetInteraction()` does the same
 * catch-up before applying its own +7 happiness boost.
 */

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
      imageUrl: "/animals/koala.svg",
    },
    ...overrides,
  } as PetWithItem;
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
      data: { happiness: 67, hunger: 40, lastInteractedAt: now },
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
      data: { happiness: 55, hunger: 55, lastInteractedAt: now },
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

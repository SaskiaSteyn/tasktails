import { beforeEach, describe, expect, it } from "vitest";

import { equipCustomization } from "@/lib/inventory";
import { prismaMock } from "@/test/prisma-mock";

/** An owned inventory row with its catalogue item, as `findFirst`/`findMany` return it. */
const owned = (id: string, category: string, imageUrl: string) =>
  ({
    id,
    userId: "user-1",
    equippedToPetId: "pet-1",
    storeItem: { category, imageUrl, name: id },
  }) as never;

describe("equipCustomization", () => {
  beforeEach(() => {
    prismaMock.inventoryItem.update.mockResolvedValue({ id: "new" } as never);
  });

  it("stacks accessories, taking off only the one in the same spot", async () => {
    prismaMock.inventoryItem.findFirst.mockResolvedValue(
      owned("new-hat", "ACCESSORIES", "/accessories/crown.svg"),
    );
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      owned("old-hat", "ACCESSORIES", "/accessories/fedora.svg"),
      owned("glasses", "ACCESSORIES", "/accessories/glasses-reading.svg"),
      owned("tie", "ACCESSORIES", "/accessories/tie-red.svg"),
    ]);

    await equipCustomization(prismaMock, "user-1", "pet-1", "new-hat");

    expect(prismaMock.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["old-hat"] } },
      data: { equippedToPetId: null },
    });
  });

  it("takes nothing off when the spot is free", async () => {
    prismaMock.inventoryItem.findFirst.mockResolvedValue(
      owned("moustache", "ACCESSORIES", "/accessories/moustache.svg"),
    );
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      owned("hat", "ACCESSORIES", "/accessories/crown.svg"),
    ]);

    await equipCustomization(prismaMock, "user-1", "pet-1", "moustache");

    expect(prismaMock.inventoryItem.updateMany).not.toHaveBeenCalled();
  });

  it("still allows one background per pet", async () => {
    prismaMock.inventoryItem.findFirst.mockResolvedValue(
      owned("maze", "DECORATIONS", "/backgrounds/maze.svg"),
    );
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      owned("hearts", "DECORATIONS", "/backgrounds/hearts.svg"),
    ]);

    await equipCustomization(prismaMock, "user-1", "pet-1", "maze");

    expect(prismaMock.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["hearts"] } },
      data: { equippedToPetId: null },
    });
  });
});

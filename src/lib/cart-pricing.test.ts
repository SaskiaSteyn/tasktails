import { describe, expect, it } from "vitest";

import { lineCost, lineListCost } from "@/lib/cart-pricing";

const line = (quantity: number) => ({
  storeItemId: "collar",
  quantity,
  storeItem: { coinPrice: 40 },
});

describe("lineCost", () => {
  it("charges every unit when the item has no deal", () => {
    expect(lineCost(line(2), {})).toBe(80);
    expect(lineCost(line(2), { other: 2 })).toBe(80);
  });

  it("charges one unit per pair on a Buy 1 get 1 item", () => {
    expect(lineCost(line(1), { collar: 2 })).toBe(40);
    expect(lineCost(line(2), { collar: 2 })).toBe(40);
    expect(lineCost(line(3), { collar: 2 })).toBe(80);
    expect(lineListCost(line(3))).toBe(120);
  });

  it("charges two units per three on a Buy 2 get 1 item", () => {
    expect(lineCost(line(2), { collar: 3 })).toBe(80);
    expect(lineCost(line(3), { collar: 3 })).toBe(80);
    expect(lineCost(line(4), { collar: 3 })).toBe(120);
    expect(lineCost(line(6), { collar: 3 })).toBe(160);
  });
});

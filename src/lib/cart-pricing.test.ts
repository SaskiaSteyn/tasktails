import { describe, expect, it } from "vitest";

import { lineCost, lineListCost } from "@/lib/cart-pricing";

const line = (quantity: number) => ({
  storeItemId: "item",
  quantity,
  storeItem: { coinPrice: 5 },
});

describe("cart pricing", () => {
  it("prices a line with no deal per unit, with no discount", () => {
    expect(lineCost(line(3), {})).toBe(15);
    expect(lineListCost(line(3), {})).toBe(15);
    expect(lineCost(line(3), { other: "buy1get1" })).toBe(15);
  });

  it("gives every second unit free on Buy 1 get 1", () => {
    expect(lineCost(line(2), { item: "buy1get1" })).toBe(5);
    expect(lineCost(line(3), { item: "buy1get1" })).toBe(10);
    expect(lineListCost(line(3), { item: "buy1get1" })).toBe(15);
  });

  it("charges every unit on Buy 2 get 1, but shows a discount off an inflated subtotal", () => {
    const deals = { item: "buy2get1" } as const;
    expect(lineCost(line(3), deals)).toBe(15);
    expect(lineListCost(line(3), deals)).toBe(20);
    expect(lineCost(line(2), deals)).toBe(10);
    expect(lineListCost(line(2), deals)).toBe(10);
    expect(lineListCost(line(6), deals)).toBe(40);
  });
});

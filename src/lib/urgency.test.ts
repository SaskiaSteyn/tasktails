import { describe, expect, it } from "vitest";

import { urgencyDataForItems } from "@/lib/urgency";

/**
 * URG-08 — the seeded-not-random contract: same user + same item always
 * produces the same fabricated `stock` value, so a participant never sees
 * "Only 3 left!" change to "Only 5 left!" on the next page load.
 */
describe("urgencyDataForItems", () => {
  it("is stable across repeated calls for the same user and item", () => {
    const first = urgencyDataForItems("user-1", ["item-a"]);
    const second = urgencyDataForItems("user-1", ["item-a"]);
    expect(first).toEqual(second);
  });

  it("keeps stock within the confirmed 1–5 range", () => {
    const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const rows = urgencyDataForItems("user-1", itemIds);
    for (const row of rows) {
      expect(row.stock).toBeGreaterThanOrEqual(1);
      expect(row.stock).toBeLessThanOrEqual(5);
    }
  });

  it("varies the seed across items and across users", () => {
    // 12 items against a 5-value range: a seed that ignored `itemId` would
    // make every one of these identical, which is astronomically unlikely by
    // chance (~5 in 5^11) even though any two individual items are allowed
    // to collide.
    const itemIds = Array.from({ length: 12 }, (_, index) => `item-${index}`);
    const forUser1 = urgencyDataForItems("user-1", itemIds);
    expect(new Set(forUser1.map((row) => row.stock)).size).toBeGreaterThan(1);

    const forUser2 = urgencyDataForItems("user-2", itemIds);
    // Same logic across users: at least one of the 12 items should land on a
    // different value for a different user, even though any single item is
    // allowed to coincidentally match.
    const anyDiffer = forUser1.some(
      (row, index) => row.stock !== forUser2[index].stock,
    );
    expect(anyDiffer).toBe(true);
  });

  it("returns one row per item id, in the same order", () => {
    const rows = urgencyDataForItems("user-1", ["item-a", "item-b"]);
    expect(rows.map((row) => row.itemId)).toEqual(["item-a", "item-b"]);
  });

  it("keeps cartActivity within the confirmed 2–9 range", () => {
    const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const rows = urgencyDataForItems("user-1", itemIds);
    for (const row of rows) {
      expect(row.cartActivity).toBeGreaterThanOrEqual(2);
      expect(row.cartActivity).toBeLessThanOrEqual(9);
    }
  });

  it("always selects at least one badge, and sometimes both", () => {
    const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const rows = urgencyDataForItems("user-1", itemIds);

    for (const row of rows) {
      expect(row.showStockBadge || row.showCartActivityBadge).toBe(true);
    }

    // Over 50 items, a seed that only ever picked one badge (never both)
    // would be indistinguishable from a genuine three-way selection unless
    // this is actually asserted.
    expect(rows.some((row) => row.showStockBadge && row.showCartActivityBadge)).toBe(
      true,
    );
    // Also confirm the "only stock" and "only cart" outcomes both occur, not
    // just "both" every time.
    expect(
      rows.some((row) => row.showStockBadge && !row.showCartActivityBadge),
    ).toBe(true);
    expect(
      rows.some((row) => !row.showStockBadge && row.showCartActivityBadge),
    ).toBe(true);
  });

  it("keeps the badge selection stable across repeated calls", () => {
    const first = urgencyDataForItems("user-1", ["item-a", "item-b", "item-c"]);
    const second = urgencyDataForItems("user-1", ["item-a", "item-b", "item-c"]);
    expect(first).toEqual(second);
  });
});

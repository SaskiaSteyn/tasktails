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

  it("shows exactly one corner badge per item, never both, never neither", () => {
    const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const rows = urgencyDataForItems("user-1", itemIds);

    for (const row of rows) {
      expect(row.showStockBadge).toBe(!row.showCartActivityBadge);
    }

    // Confirm both outcomes actually occur over 50 items, not just one every time.
    expect(rows.some((row) => row.showStockBadge)).toBe(true);
    expect(rows.some((row) => row.showCartActivityBadge)).toBe(true);
  });

  it("keeps the badge selection stable across repeated calls", () => {
    const first = urgencyDataForItems("user-1", ["item-a", "item-b", "item-c"]);
    const second = urgencyDataForItems("user-1", ["item-a", "item-b", "item-c"]);
    expect(first).toEqual(second);
  });

  it("keeps recentPurchases within the confirmed 3–7 range", () => {
    const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const rows = urgencyDataForItems("user-1", itemIds);
    for (const row of rows) {
      expect(row.recentPurchases).toBeGreaterThanOrEqual(3);
      expect(row.recentPurchases).toBeLessThanOrEqual(7);
    }
  });

  it("shows showRecentPurchases on some items but not all, stably", () => {
    const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const rows = urgencyDataForItems("user-1", itemIds);

    // Unlike the two corner badges, this one is allowed to be off entirely —
    // confirm both outcomes actually occur over 50 items.
    expect(rows.some((row) => row.showRecentPurchases)).toBe(true);
    expect(rows.some((row) => !row.showRecentPurchases)).toBe(true);

    const second = urgencyDataForItems("user-1", itemIds);
    expect(second.map((row) => row.showRecentPurchases)).toEqual(
      rows.map((row) => row.showRecentPurchases),
    );
  });

  it("keeps showRecentPurchases independent of the corner-badge selection", () => {
    // A seed bug that reused the same hash input for both selections would
    // make them perfectly correlated; assert that isn't the case over a
    // large enough sample.
    const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const rows = urgencyDataForItems("user-1", itemIds);
    const stockAndRecent = rows.filter(
      (row) => row.showRecentPurchases && row.showStockBadge,
    ).length;
    const cartAndRecent = rows.filter(
      (row) => row.showRecentPurchases && row.showCartActivityBadge,
    ).length;
    // If the two seeds were identical, every "showRecentPurchases" row would
    // always pair with the same corner badge — expect a mix of both.
    expect(stockAndRecent).toBeGreaterThan(0);
    expect(cartAndRecent).toBeGreaterThan(0);
  });

  it("never shows more than one of the four note types on the same item (URG-05/URG-06/URG-07 mutual exclusivity)", () => {
    const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const rows = urgencyDataForItems("user-1", itemIds);
    for (const row of rows) {
      const count = [
        row.showRecentPurchases,
        row.showUrgencyLanguage,
        row.showBundleTimer,
        row.showCurrencyUrgency,
      ].filter(Boolean).length;
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it("shows all four note types, and neither, each at least once", () => {
    const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);
    const rows = urgencyDataForItems("user-1", itemIds);
    expect(rows.some((row) => row.showRecentPurchases)).toBe(true);
    expect(rows.some((row) => row.showUrgencyLanguage)).toBe(true);
    expect(rows.some((row) => row.showBundleTimer)).toBe(true);
    expect(rows.some((row) => row.showCurrencyUrgency)).toBe(true);
    expect(
      rows.some(
        (row) =>
          !row.showRecentPurchases &&
          !row.showUrgencyLanguage &&
          !row.showBundleTimer &&
          !row.showCurrencyUrgency,
      ),
    ).toBe(true);
  });

  it("keeps the note selection stable across repeated calls", () => {
    const itemIds = Array.from({ length: 12 }, (_, index) => `item-${index}`);
    const noteFlags = (row: ReturnType<typeof urgencyDataForItems>[number]) => [
      row.showRecentPurchases,
      row.showUrgencyLanguage,
      row.showBundleTimer,
      row.showCurrencyUrgency,
    ];
    const first = urgencyDataForItems("user-1", itemIds);
    const second = urgencyDataForItems("user-1", itemIds);
    expect(first.map(noteFlags)).toEqual(second.map(noteFlags));
  });
});

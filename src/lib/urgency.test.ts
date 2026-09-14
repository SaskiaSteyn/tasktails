import { describe, expect, it } from "vitest";

import {
  fakeDiscountPricing,
  flashSaleOnDay,
  urgencyDataForItems,
  urgencyDayKey,
} from "@/lib/urgency";

/**
 * A fixed UTC day, passed explicitly wherever a test asserts two calls agree
 * — since #187 the seed depends on the calendar day, so a bare
 * `new Date()`-vs-`new Date()` comparison would flake across a midnight
 * rollover.
 */
const DAY = new Date("2026-03-15T12:00:00Z");

/**
 * URG-08 — the seeded-not-random contract: same user + same item always
 * produces the same fabricated `stock` value, so a participant never sees
 * "Only 3 left!" change to "Only 5 left!" on the next page load.
 */
describe("urgencyDataForItems", () => {
  it("is stable across repeated calls for the same user and item", () => {
    const first = urgencyDataForItems("user-1", ["item-a"], DAY);
    const second = urgencyDataForItems("user-1", ["item-a"], DAY);
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
    const first = urgencyDataForItems("user-1", ["item-a", "item-b", "item-c"], DAY);
    const second = urgencyDataForItems("user-1", ["item-a", "item-b", "item-c"], DAY);
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
    const rows = urgencyDataForItems("user-1", itemIds, DAY);

    // Unlike the two corner badges, this one is allowed to be off entirely —
    // confirm both outcomes actually occur over 50 items.
    expect(rows.some((row) => row.showRecentPurchases)).toBe(true);
    expect(rows.some((row) => !row.showRecentPurchases)).toBe(true);

    const second = urgencyDataForItems("user-1", itemIds, DAY);
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
    const first = urgencyDataForItems("user-1", itemIds, DAY);
    const second = urgencyDataForItems("user-1", itemIds, DAY);
    expect(first.map(noteFlags)).toEqual(second.map(noteFlags));
  });
});

/**
 * #187 — the fabricated urgency has to move so participants don't habituate.
 * Every seeded value rotates on the UTC calendar-day boundary, but stays put
 * within a day so it never flickers mid-session.
 */
describe("urgencyDataForItems — daily rotation", () => {
  const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index}`);

  it("is identical for two different times on the same UTC day", () => {
    const morning = urgencyDataForItems("user-1", itemIds, new Date("2026-03-15T06:30:00Z"));
    const night = urgencyDataForItems("user-1", itemIds, new Date("2026-03-15T23:59:59Z"));
    expect(morning).toEqual(night);
  });

  it("reshuffles across a day boundary", () => {
    const day1 = urgencyDataForItems("user-1", itemIds, new Date("2026-03-15T12:00:00Z"));
    const day2 = urgencyDataForItems("user-1", itemIds, new Date("2026-03-16T12:00:00Z"));

    // Over 50 items each seeded value should land somewhere different on the
    // next day — assert the aggregate moved, not any single item (a lone
    // 1–5 value is allowed to coincidentally repeat).
    const moved = (pick: (row: (typeof day1)[number]) => unknown) =>
      day1.some((row, index) => pick(row) !== pick(day2[index]));

    expect(moved((row) => row.stock)).toBe(true);
    expect(moved((row) => row.cartActivity)).toBe(true);
    expect(moved((row) => row.recentPurchases)).toBe(true);
    expect(moved((row) => row.showStockBadge)).toBe(true);
    expect(
      moved((row) => `${row.showRecentPurchases}${row.showUrgencyLanguage}${row.showBundleTimer}${row.showCurrencyUrgency}`),
    ).toBe(true);
  });

  it("stays within the confirmed ranges on any day", () => {
    for (const iso of ["2026-01-01T00:00:00Z", "2026-07-04T12:00:00Z", "2027-12-31T23:00:00Z"]) {
      const rows = urgencyDataForItems("user-1", itemIds, new Date(iso));
      for (const row of rows) {
        expect(row.stock).toBeGreaterThanOrEqual(1);
        expect(row.stock).toBeLessThanOrEqual(5);
        expect(row.cartActivity).toBeGreaterThanOrEqual(2);
        expect(row.cartActivity).toBeLessThanOrEqual(9);
        expect(row.recentPurchases).toBeGreaterThanOrEqual(3);
        expect(row.recentPurchases).toBeLessThanOrEqual(7);
        expect(row.showStockBadge).toBe(!row.showCartActivityBadge);
        const notes = [
          row.showRecentPurchases,
          row.showUrgencyLanguage,
          row.showBundleTimer,
          row.showCurrencyUrgency,
        ].filter(Boolean).length;
        expect(notes).toBeLessThanOrEqual(1);
      }
    }
  });
});

/**
 * #185 — "inflate the price, cross it out, sell it for the price group A
 * sees". The struck `list` price is fabricated; the bold `sale` price is the
 * real `coinPrice`, so Group B never actually pays less (or more) than
 * Group A.
 */
describe("fakeDiscountPricing", () => {
  it("sells at exactly the real price, with the struck price inflated 20%", () => {
    for (const base of [30, 40, 65, 130, 999]) {
      const { list, sale } = fakeDiscountPricing(base);
      expect(sale).toBe(base);
      expect(list).toBe(Math.round(base * 1.2));
      expect(list).toBeGreaterThan(sale);
    }
  });

});

/**
 * #291 — the discount layer rests one UTC day in three, seeded the same way
 * every other stimulus is. The properties that matter for the study are that
 * it holds steady within a day (no flicker mid-session), that it genuinely
 * varies across days and across participants, and that a given day is
 * reproducible from the date alone months later.
 */
describe("flashSaleOnDay", () => {
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  it("holds steady all day, whatever the clock time", () => {
    for (const hour of ["00:00:00", "09:13:44", "23:59:59"]) {
      expect(flashSaleOnDay("user-1", new Date(`2026-09-13T${hour}.000Z`))).toBe(
        flashSaleOnDay("user-1", day("2026-09-13")),
      );
    }
  });

  it("rests exactly one day in every three, and never twice in a row", () => {
    for (const userId of ["user-1", "user-2", "user-3", "user-4"]) {
      const run = Array.from({ length: 300 }, (_, i) =>
        flashSaleOnDay(userId, new Date(Date.UTC(2026, 0, 1 + i))),
      );
      // Exactly one rest in every window of three — the property a per-day
      // coin flip does not have, and the reason this is a cycle.
      for (let i = 0; i + 3 <= run.length; i += 1) {
        expect(run.slice(i, i + 3).filter((on) => !on)).toHaveLength(1);
      }
      expect(run.some((on, i) => !on && !run[i + 1])).toBe(false);
    }
  });

  it("staggers rest days across participants rather than resting the cohort at once", () => {
    const forUser = (userId: string) =>
      Array.from({ length: 30 }, (_, i) =>
        flashSaleOnDay(userId, new Date(Date.UTC(2026, 0, 1 + i))),
      ).join("");
    // Not "any two users differ" — there are only three offsets, so a third of
    // any pair legitimately shares a schedule. What must not happen is every
    // participant resting on the same day, which would make the off-day look
    // like the store being broken rather than the sale being over for a day.
    const schedules = new Set(
      ["user-1", "user-2", "user-3", "user-4", "user-5", "user-6"].map(forUser),
    );
    expect(schedules.size).toBeGreaterThan(1);
  });

  it("reproduces a past day exactly from its urgencyDayKey", () => {
    const then = new Date("2026-05-04T17:22:09.000Z");
    expect(urgencyDayKey(then)).toBe("2026-05-04");
    expect(flashSaleOnDay("user-1", new Date(urgencyDayKey(then)))).toBe(
      flashSaleOnDay("user-1", then),
    );
  });
});

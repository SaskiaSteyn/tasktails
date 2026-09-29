import { describe, expect, it } from "vitest";

import { deadlineOf, hasDueTime } from "./day";

describe("due time (#336)", () => {
  it("treats local midnight as a date-only deadline, due at end of day", () => {
    const dateOnly = new Date(2026, 8, 29);
    expect(hasDueTime(dateOnly)).toBe(false);
    expect(deadlineOf(dateOnly)).toEqual(new Date(2026, 8, 30));
  });

  it("uses the time itself when one is set", () => {
    const timed = new Date(2026, 8, 29, 14, 30);
    expect(hasDueTime(timed)).toBe(true);
    expect(deadlineOf(timed)).toEqual(timed);
  });
});

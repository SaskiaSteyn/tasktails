import { describe, expect, it } from "vitest";

import { mannWhitney, median } from "./analysis";

describe("mannWhitney", () => {
  it("matches the textbook value for fully separated groups", () => {
    // n = 5 + 5, U = 25 for B; z = (12.5 − 0.5) / 4.787 → p = 0.01219.
    const result = mannWhitney([1, 2, 3, 4, 5], [6, 7, 8, 9, 10])!;
    expect(result.u).toBe(25);
    expect(result.p).toBeCloseTo(0.01219, 4);
    expect(result.r).toBe(1);
  });

  it("applies the tie correction", () => {
    // Worked by hand (R: wilcox.test(exact = FALSE) gives W = 2.5, p = 0.1366).
    const result = mannWhitney([1, 2, 2, 3], [2, 3, 4, 5])!;
    expect(result.u).toBe(13.5);
    expect(result.p).toBeCloseTo(0.1366, 3);
    expect(result.r).toBeCloseTo(0.6875);
  });

  it("is symmetric and handles no difference", () => {
    expect(mannWhitney([6, 7, 8], [1, 2, 3])!.r).toBe(-1);
    expect(mannWhitney([0, 0, 0], [0, 0])).toEqual({ u: 3, p: 1, r: 0 });
    expect(mannWhitney([], [1])).toBeNull();
  });
});

describe("median", () => {
  it("handles odd, even and empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

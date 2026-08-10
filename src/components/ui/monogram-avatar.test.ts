import { describe, expect, it } from "vitest";

import { initialsOf } from "@/components/ui/monogram-avatar";

/** LEAD-07 — the initials fallback, which is what most leaderboard rows draw. */
describe("initialsOf", () => {
  it("takes one letter from a single-word handle", () => {
    expect(initialsOf("Kai")).toBe("K");
  });

  it("takes the first two words, not the first two letters", () => {
    expect(initialsOf("test user 4")).toBe("TU");
  });

  it("upper-cases a lowercase handle", () => {
    // Handles are stored lowercase (AUTH-07), so this is the common case.
    expect(initialsOf("saskiasteyn")).toBe("S");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(initialsOf("  aria   b  ")).toBe("AB");
  });

  it("falls back to a dash rather than rendering an empty circle", () => {
    expect(initialsOf("   ")).toBe("–");
    expect(initialsOf("")).toBe("–");
  });

  it("handles astral characters without splitting a surrogate pair", () => {
    // [...word][0] rather than word[0] — the latter returns half a code point
    // and renders as a replacement glyph.
    expect(initialsOf("𝔎ai")).toBe("𝔎");
  });
});

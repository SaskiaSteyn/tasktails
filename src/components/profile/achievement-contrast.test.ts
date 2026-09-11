import { describe, expect, it } from "vitest";

import { AA_LARGE, AA_TEXT, bpca, readColorTokens } from "@/lib/contrast";

/**
 * #283 — a locked achievement's text failed contrast: `ink-disabled` on
 * the row's `bg-warm` measured 1.99 BPCA, against the 4.5 body text needs.
 *
 * This pins the pairings rather than the fix. The tokens are read from
 * `globals.css` at run time, so darkening or lightening any of them — or
 * swapping a component back to `ink-disabled` — fails here rather than
 * quietly shipping unreadable text again. `AA_LARGE` (3:1) is the bar for
 * the padlock, which is non-text content, not body copy.
 *
 * Written as a token-level check rather than a render assertion because
 * that is where the defect lived: the markup was fine, the colour was not.
 */
const t = readColorTokens();

describe("locked achievements are legible", () => {
  it.each([
    ["row name and description, on the row's warm card", "ink-soft", "warm"],
    ["row progress counter, same card", "ink-soft", "warm"],
    ["grid tile label, on the tile's input fill", "ink-soft", "input"],
  ])("%s clears AA for body text", (_label, fg, bg) => {
    expect(bpca(t[fg], t[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each([
    ["row padlock", "ink-faint", "input"],
    ["grid padlock", "ink-faint", "input"],
  ])("%s clears the 3:1 non-text bar", (_label, fg, bg) => {
    expect(bpca(t[fg], t[bg])).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it("still reads as locked — a locked name stays a step below an earned one", () => {
    // The fix must not flatten the hierarchy into "everything is ink".
    const locked = bpca(t["ink-soft"], t["warm"]);
    const earned = bpca(t["ink"], t["surface"]);
    expect(locked).toBeLessThan(earned);
  });

  it("documents why ink-disabled was wrong, so it is not reintroduced", () => {
    expect(bpca(t["ink-disabled"], t["warm"])).toBeLessThan(AA_TEXT);
  });
});

import { describe, expect, it } from "vitest";

import { FEED_EFFECT, type FoodRarity, feedEffectOf, hungerLabel } from "@/lib/feed-value";

/**
 * The point of the table is the ordering, not the exact figures: rarer food
 * has to be worth more, or the store is back to charging 31× for identical
 * effect. Pinning the ladder rather than each number leaves the balance
 * tunable without a test edit every time.
 */
const LADDER: FoodRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

describe("FEED_EFFECT", () => {
  it("feeds and cheers strictly more as rarity rises", () => {
    for (let i = 1; i < LADDER.length; i++) {
      const cheaper = FEED_EFFECT[LADDER[i - 1]];
      const dearer = FEED_EFFECT[LADDER[i]];
      // `hunger` is negative — more relief is a *smaller* number.
      expect(dearer.hunger).toBeLessThan(cheaper.hunger);
      expect(dearer.happiness).toBeGreaterThan(cheaper.happiness);
    }
  });

  it("never relieves more hunger than a pet can have", () => {
    for (const rarity of LADDER) {
      expect(FEED_EFFECT[rarity].hunger).toBeGreaterThanOrEqual(-100);
    }
  });

  it("keeps the original flat rate as the Common baseline", () => {
    // The rate every existing participant already knows: nothing about cheap
    // food changed under them when rarer food started doing more.
    expect(FEED_EFFECT.COMMON).toEqual({ hunger: -18, happiness: 4 });
  });

  it("feeds an item with no rarity as a Common", () => {
    // `StoreItem.rarity` is nullable, and a null must not feed `undefined`
    // into the pet's hunger.
    expect(feedEffectOf(null)).toEqual(FEED_EFFECT.COMMON);
    expect(feedEffectOf(undefined)).toEqual(FEED_EFFECT.COMMON);
  });
});

/**
 * #277 — the stored value is negative because it is subtracted from the
 * pet's hunger, but "-18 hunger" reads as *more* hungry. The copy says
 * "less".
 */
describe("hungerLabel", () => {
  it("says less, and never shows the minus sign", () => {
    expect(hungerLabel("COMMON")).toBe("less 18 hunger");
    expect(hungerLabel("EPIC")).toBe("less 80 hunger");
  });

  it("never leaks a minus for any tier, including the one with no food seeded", () => {
    for (const rarity of Object.keys(FEED_EFFECT) as FoodRarity[]) {
      expect(hungerLabel(rarity)).not.toContain("-");
      expect(hungerLabel(rarity)).toMatch(/^less \d+ hunger$/);
    }
  });

  it("falls back to Common for an item with no rarity, same as feedEffectOf", () => {
    expect(hungerLabel(null)).toBe("less 18 hunger");
  });
});

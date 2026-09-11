import { describe, expect, it } from "vitest";

import { StoreItemRarity } from "@/generated/prisma/client";
import { RARITY_TOKENS, fieldStyle, rarityLabel, rarityTokens } from "@/lib/rarity";

/**
 * #276 — the rarity token table and the product rules that constrain it,
 * per `design_handoff/design_handoff_rarity/UPDATE-01-card-anatomy.md`.
 *
 * The colours themselves are design data, not logic, so they are not
 * re-asserted value by value here — the card renders them and the handoff
 * is the source. What is worth pinning is the behaviour around them: the
 * fallback, the four-tier list, and the two motion rules, each of which is
 * a rule someone could plausibly break while editing the table.
 */
describe("rarityTokens", () => {
  it("falls back to Common for a null tier", () => {
    // `StoreItem.rarity` is nullable in the schema — UPDATE-01 §7 rule 2.
    expect(rarityTokens(null)).toBe(RARITY_TOKENS.COMMON);
    expect(rarityTokens(undefined)).toBe(RARITY_TOKENS.COMMON);
  });

  it("falls back to Common for a tier that is not in the table", () => {
    expect(rarityTokens("UNCOMMON" as StoreItemRarity)).toBe(RARITY_TOKENS.COMMON);
  });

  it("covers exactly the four shipped tiers — Uncommon is retired", () => {
    // The reference README draws five; UPDATE-01 §3 corrects it to the
    // enum the product actually has.
    expect(Object.keys(RARITY_TOKENS).sort()).toEqual([
      "COMMON",
      "EPIC",
      "LEGENDARY",
      "RARE",
    ]);
  });
});

describe("tier motion rules", () => {
  it("twinkles only at Epic and above", () => {
    // UPDATE-01 §7 rule 4.
    expect(RARITY_TOKENS.COMMON.sparks).toBe(false);
    expect(RARITY_TOKENS.RARE.sparks).toBe(false);
    expect(RARITY_TOKENS.EPIC.sparks).toBe(true);
    expect(RARITY_TOKENS.LEGENDARY.sparks).toBe(true);
  });

  it("sweeps a sheen at Legendary only", () => {
    const sheening = Object.entries(RARITY_TOKENS)
      .filter(([, tokens]) => tokens.sheen)
      .map(([tier]) => tier);
    expect(sheening).toEqual(["LEGENDARY"]);
  });

  it("gives Common no shadow and no field effect", () => {
    expect(RARITY_TOKENS.COMMON.shadow).toBeNull();
    expect(RARITY_TOKENS.COMMON.fieldFx).toBeNull();
  });
});

describe("fieldStyle", () => {
  it("paints a flat tier as a colour", () => {
    expect(fieldStyle(RARITY_TOKENS.RARE)).toEqual({ backgroundColor: "#EEF5EF" });
  });

  it("paints Legendary's gradient as an image — a gradient is not a colour", () => {
    // The one tier whose `field` is a gradient; `background-color` cannot
    // hold one, which is the whole reason this helper exists.
    expect(fieldStyle(RARITY_TOKENS.LEGENDARY)).toEqual({
      backgroundImage: "linear-gradient(160deg,#FDF3DE,#FBE3B4)",
    });
  });
});

describe("rarityLabel", () => {
  it("title-cases the enum for display", () => {
    expect(rarityLabel("LEGENDARY")).toBe("Legendary");
    expect(rarityLabel(null)).toBe("Common");
  });
});

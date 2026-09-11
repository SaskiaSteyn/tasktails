import { describe, expect, it } from "vitest";

import { StoreItemRarity } from "@/generated/prisma/client";
import { RARITY_TOKENS, rarityFamily, rarityLabel, rarityTokens } from "@/lib/rarity";

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

describe("tokens, not hex", () => {
  it("expresses every colour as a theme class", () => {
    // User's direction, 2026-09-11: the repository's colours are the source
    // of truth, not the handoff's raw hex. A literal `#` here means a tier
    // has been hard-coded past the token layer.
    for (const tokens of Object.values(RARITY_TOKENS)) {
      for (const value of [tokens.frame, tokens.field, tokens.chipBg, tokens.chipInk, tokens.chipLine]) {
        expect(value).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      }
      // The field highlight is the exception: plain white at varying alpha,
      // with no brand colour in it to tokenise.
      if (tokens.fieldFx) expect(tokens.fieldFx).toContain("rgba(255,255,255");
    }
  });

  it("gives the reveal and achievement surfaces one family map to share", () => {
    expect(rarityFamily("EPIC").text).toBe("text-violet-text");
    expect(rarityFamily(null).text).toBe("text-ink-soft");
  });
});

describe("rarityLabel", () => {
  it("title-cases the enum for display", () => {
    expect(rarityLabel("LEGENDARY")).toBe("Legendary");
    expect(rarityLabel(null)).toBe("Common");
  });
});

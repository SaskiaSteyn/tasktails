import type { StoreItemRarity } from "@/generated/prisma/client";

/**
 * #276 — the one rarity visual system, per
 * `design_handoff/design_handoff_rarity/` (README plus UPDATE-01, which
 * supersedes the README's card layout and corrects its tier list).
 *
 * **Four tiers, not the README's five.** `StoreItemRarity` is
 * `COMMON | RARE | EPIC | LEGENDARY`; Uncommon does not exist in this
 * product and the reference's blue Rare goes with it — the shipped family
 * for Rare is sage, which the Lucky Box and achievement screens already
 * ship. UPDATE-01 §3 makes that correction in writing.
 *
 * Every colour here is quoted exactly from that table rather than mapped
 * onto the nearest existing `@theme` token. The tokens and these are close
 * cousins (Rare *is* the sage family) but not equal to the hex the handoff
 * calls final, and the handoff is explicit that it is high-fidelity: the
 * `shipped token family` column names the relative, it does not license a
 * substitution. Anything that only needs the family — a chip's text colour
 * in a dense row — can still use the token.
 *
 * `rarity` is nullable in the schema, so every lookup goes through
 * {@link rarityTokens}, which falls back to Common — the same fallback
 * `feedEffectOf()` already uses. The live catalogue has no nulls since
 * GACHA-03 seeded it, but the column still permits them.
 */
export type RarityTokens = {
  /** 1.5px card border and the footer's hairline. */
  frame: string;
  /** Art-tile fill. A gradient at Legendary, a flat colour elsewhere. */
  field: string;
  /** Absolutely-positioned layer behind the art. Null where the tier has no effect. */
  fieldFx: string | null;
  /** Card shadow. Null at Common, which has none. */
  shadow: string | null;
  chipBg: string;
  chipInk: string;
  chipLine: string;
  /** Whether this tier twinkles. Epic and above only (UPDATE-01 §7 rule 4). */
  sparks: boolean;
  /** Whether the full-card sheen sweeps. Legendary only. */
  sheen: boolean;
};

export const RARITY_TOKENS: Record<StoreItemRarity, RarityTokens> = {
  COMMON: {
    frame: "#EFE7DA",
    field: "#FBF3E6",
    fieldFx: null,
    shadow: null,
    chipBg: "#F4EEE4",
    chipInk: "#8A8178",
    chipLine: "#E8DFD0",
    sparks: false,
    sheen: false,
  },
  RARE: {
    frame: "#CADFCF",
    field: "#EEF5EF",
    fieldFx:
      "radial-gradient(circle at 50% 30%, rgba(255,255,255,.85), rgba(255,255,255,0) 62%)",
    shadow: "0 10px 22px rgba(63,140,99,.10)",
    chipBg: "#E7F0E9",
    chipInk: "#3F8C63",
    chipLine: "#CBE1D2",
    sparks: false,
    sheen: false,
  },
  EPIC: {
    frame: "#CFC2E8",
    field: "#EEE9F5",
    fieldFx:
      "linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,.7) 50%, rgba(255,255,255,0) 62%)",
    shadow: "0 14px 30px rgba(92,84,112,.20)",
    chipBg: "#EBE4F6",
    chipInk: "#5C5470",
    chipLine: "#D8CDEC",
    sparks: true,
    sheen: false,
  },
  LEGENDARY: {
    frame: "#E9C26A",
    field: "linear-gradient(160deg,#FDF3DE,#FBE3B4)",
    fieldFx:
      "radial-gradient(circle at 50% 28%, rgba(255,255,255,.9), rgba(255,255,255,0) 58%)",
    shadow: "0 16px 34px rgba(200,150,40,.26)",
    chipBg: "#FBE3B4",
    chipInk: "#8A6410",
    chipLine: "#EBCB84",
    sparks: true,
    sheen: true,
  },
};

/** Null and unknown tiers render as Common — UPDATE-01 §7 rule 2. */
export function rarityTokens(rarity: StoreItemRarity | null | undefined): RarityTokens {
  return (rarity && RARITY_TOKENS[rarity]) || RARITY_TOKENS.COMMON;
}

/** What the tier chip reads. Title case, uppercased by CSS where the design asks for it. */
export function rarityLabel(rarity: StoreItemRarity | null | undefined): string {
  const value = rarity ?? "COMMON";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/**
 * `field` is a colour at three tiers and a gradient at Legendary, and those
 * are different CSS properties — `background-color` cannot hold a gradient
 * and `background-image` cannot hold a bare colour. One helper so no caller
 * has to remember which tier is the odd one out.
 */
export function fieldStyle(tokens: RarityTokens): React.CSSProperties {
  return tokens.field.includes("gradient")
    ? { backgroundImage: tokens.field }
    : { backgroundColor: tokens.field };
}

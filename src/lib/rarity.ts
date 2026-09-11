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
 * **Everything here is a `@theme` token, not the handoff's raw hex**
 * (user's direction, 2026-09-11: the repository's colours are the source of
 * truth). The handoff calls its hex final, but several of its values
 * predate this repo's contrast audit — its Common chip ink `#8A8178` is the
 * old `ink-soft`, since darkened to `#524C47` to reach AA, and it measures
 * 2.99 BPCA on the chip fill it is paired with. The handoff's own table
 * names the shipped family for each tier in its last column, so this is the
 * mapping it asks for rather than a substitution: sage for Rare, violet for
 * Epic, amber for Legendary, the neutral border/ink for Common.
 *
 * Class strings rather than style objects so the tokens stay the single
 * source (AGENTS.md: "Tokens, not hex"), and so a tier's colours can be
 * retuned in `globals.css` without touching a component.
 *
 * `rarity` is nullable in the schema, so every lookup goes through
 * {@link rarityTokens}, which falls back to Common — the same fallback
 * `feedEffectOf()` already uses. The live catalogue has no nulls since
 * GACHA-03 seeded it, but the column still permits them.
 */
export type RarityTokens = {
  /** Card/row frame. Paired with `border-[1.5px]`, never Tailwind's 1px `border`. */
  frame: string;
  /** Art-tile and row-thumb fill. A gradient at Legendary, a flat tint elsewhere. */
  field: string;
  /**
   * Absolutely-positioned highlight behind the art. Achromatic — plain
   * white at varying opacity — so unlike everything else here it stays a
   * raw gradient: there is no brand colour in it to tokenise.
   */
  fieldFx: string | null;
  /** Card shadow class. Null at Common, which has none. */
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
    frame: "border-border-track",
    field: "bg-input",
    fieldFx: null,
    shadow: null,
    chipBg: "bg-input",
    chipInk: "text-ink-soft",
    chipLine: "border-border-input",
    sparks: false,
    sheen: false,
  },
  RARE: {
    frame: "border-sage/45",
    field: "bg-sage-tint",
    fieldFx:
      "radial-gradient(circle at 50% 30%, rgba(255,255,255,.85), rgba(255,255,255,0) 62%)",
    shadow: "shadow-rarity-rare",
    chipBg: "bg-sage-tint",
    chipInk: "text-sage-text",
    chipLine: "border-sage/30",
    sparks: false,
    sheen: false,
  },
  EPIC: {
    frame: "border-violet/45",
    field: "bg-violet-tint",
    fieldFx:
      "linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,.7) 50%, rgba(255,255,255,0) 62%)",
    shadow: "shadow-rarity-epic",
    chipBg: "bg-violet-tint",
    chipInk: "text-violet-text",
    chipLine: "border-violet/30",
    sparks: true,
    sheen: false,
  },
  LEGENDARY: {
    frame: "border-amber/70",
    field:
      "bg-[linear-gradient(160deg,var(--color-warm),var(--color-amber-tint))]",
    fieldFx:
      "radial-gradient(circle at 50% 28%, rgba(255,255,255,.9), rgba(255,255,255,0) 58%)",
    shadow: "shadow-rarity-legendary",
    chipBg: "bg-amber-tint",
    chipInk: "text-amber-text",
    chipLine: "border-amber/40",
    sparks: true,
    sheen: true,
  },
};

/**
 * The Tailwind family each tier belongs to, for the surfaces that colour
 * *something other than* a card — the Lucky Box reveal's rarity word, the
 * achievement tiles. Both kept private copies of this map before #276
 * (`RARITY_STYLE` in `lucky-box-home.tsx`, the per-key colours in
 * `achievement-style.ts`); this is the shared one UPDATE-01 asks for.
 */
export const RARITY_FAMILY: Record<
  StoreItemRarity,
  { tint: string; text: string; border: string }
> = {
  COMMON: {
    tint: "bg-input",
    text: "text-ink-soft",
    border: "border-border-track",
  },
  RARE: {
    tint: "bg-sage-tint",
    text: "text-sage-text",
    border: "border-sage/30",
  },
  EPIC: {
    tint: "bg-violet-tint",
    text: "text-violet-text",
    border: "border-violet/30",
  },
  LEGENDARY: {
    tint: "bg-amber-tint",
    text: "text-amber-text",
    border: "border-amber/30",
  },
};

/** Null and unknown tiers render as Common — UPDATE-01 §7 rule 2. */
export function rarityTokens(
  rarity: StoreItemRarity | null | undefined,
): RarityTokens {
  return (rarity && RARITY_TOKENS[rarity]) || RARITY_TOKENS.COMMON;
}

/** Null and unknown tiers render as Common, same rule as {@link rarityTokens}. */
export function rarityFamily(rarity: StoreItemRarity | null | undefined) {
  return (rarity && RARITY_FAMILY[rarity]) || RARITY_FAMILY.COMMON;
}

/** What the tier chip reads. Title case; the chip uppercases it in CSS. */
export function rarityLabel(
  rarity: StoreItemRarity | null | undefined,
): string {
  const value = rarity ?? "COMMON";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

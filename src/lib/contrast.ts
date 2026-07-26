import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Server-only helpers for the living style guide.
 *
 * Token values are parsed straight out of `globals.css` rather than duplicated
 * here, so the style-guide page can never drift from what the app actually
 * ships. The page is statically generated, so this runs at build time.
 */

/** Every `--color-*` token in `globals.css`, keyed without the prefix. */
export function readColorTokens(): Record<string, string> {
  const css = readFileSync(
    join(process.cwd(), "src", "app", "globals.css"),
    "utf8",
  );

  const tokens: Record<string, string> = {};
  for (const [, name, value] of css.matchAll(
    /--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g,
  )) {
    tokens[name] = value.toUpperCase();
  }
  return tokens;
}

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const [r, g, b] = hex
    .replace("#", "")
    .match(/../g)!
    .map((h) => parseInt(h, 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colours, 1–21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** AA thresholds: 4.5 normal text, 3 large text and non-text UI. */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

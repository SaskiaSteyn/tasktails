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

function rgb(hex: string): [number, number, number] {
  const [r, g, b] = hex
    .replace("#", "")
    .match(/../g)!
    .map((h) => parseInt(h, 16));
  return [r, g, b];
}

/* ==========================================================================
   WCAG 2 — kept for comparison only
   ========================================================================== */

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG 2 contrast ratio, 1–21.
 *
 * Order-independent and perceptually wrong at both ends of the range — it is
 * kept so the style guide can show what the old method said, not to decide
 * anything. Use {@link bpca}.
 */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ==========================================================================
   Bridge-PCA — the method this project audits against
   ========================================================================== */

/**
 * BPCA: a bridge for WCAG 2 contrast using APCA.
 *
 * Ported from the reference implementation — `bridge-pca` 0.1.6 by Andrew
 * Somers (Myndex), W3 licence, https://www.myndex.com/BPCA/ — because that
 * package cannot be imported as published: `src/bridge-pca.js` hardcodes
 * `../node_modules/colorparsley/...`, which npm's hoisting breaks. The constants
 * and the arithmetic below are the package's own, not a reimplementation, and
 * `scripts/verify-bpca.mjs` checks this file still agrees with it.
 *
 * Why bother, when the output is still a WCAG 2 style ratio: WCAG 2's formula
 * ignores how the eye actually works — it is far too lenient on light-on-dark
 * pairings and too harsh on mid-tones, which is exactly the range this warm
 * palette lives in. APCA models perceived lightness instead, and the *bridge*
 * re-expresses that as a WCAG 2 ratio so NFR-GEN-1 can still be stated as
 * "4.5:1" and the study can still claim WCAG AA.
 *
 * POLARITY MATTERS. Unlike WCAG 2, this is not symmetric — pass the text colour
 * first and the background second. Swapping them gives a different answer.
 */

/** Screen luminance Y, 0–1. BPCA's own 2.4-exponent transfer curve. */
function bpcaY(hex: string): number {
  const mainTRC = 2.4;
  const sRco = 0.2126478133913640;
  const sGco = 0.7151791475336150;
  const sBco = 0.0721730390750208;

  const [r, g, b] = rgb(hex);
  const exp = (c: number) => Math.pow(c / 255, mainTRC);
  return sRco * exp(r) + sGco * exp(g) + sBco * exp(b);
}

/**
 * Lightness contrast, roughly -108…+106.
 *
 * Positive is dark text on a light background, negative is light text on a dark
 * one. Around ±60 corresponds to WCAG 2's old 4.5:1.
 */
export function bpcaLc(text: string, background: string): number {
  const normBG = 0.56,
    normTXT = 0.57,
    revTXT = 0.62,
    revBG = 0.65;
  const blkThrs = 0.022,
    blkClmp = 1.414,
    scaleBoW = 1.14,
    scaleWoB = 1.14,
    loBoWoffset = 0.027,
    loWoBoffset = 0.027,
    bridgeWoBfact = 0.1414,
    bridgeWoBpivot = 0.84,
    loClip = 0.1,
    deltaYmin = 0.0005;

  let txtY = bpcaY(text);
  let bgY = bpcaY(background);

  // Soft-clamp near-black, where the transfer curve misbehaves.
  txtY = txtY > blkThrs ? txtY : txtY + Math.pow(blkThrs - txtY, blkClmp);
  bgY = bgY > blkThrs ? bgY : bgY + Math.pow(blkThrs - bgY, blkClmp);

  if (Math.abs(bgY - txtY) < deltaYmin) return 0;

  let output: number;
  if (bgY > txtY) {
    // Normal polarity — dark text on light (BoW).
    const sapc = (Math.pow(bgY, normBG) - Math.pow(txtY, normTXT)) * scaleBoW;
    output = sapc < loClip ? 0 : sapc - loBoWoffset;
  } else {
    // Reverse polarity — light text on dark (WoB). The `bridge` term is the
    // package's deliberate offset to line up with WCAG 2's incorrect maths.
    const sapc = (Math.pow(bgY, revBG) - Math.pow(txtY, revTXT)) * scaleWoB;
    const bridge = Math.max(0, txtY / bridgeWoBpivot - 1) * bridgeWoBfact;
    output = sapc > -loClip ? 0 : sapc + loWoBoffset + bridge;
  }

  return output * 100;
}

/**
 * The same contrast expressed as a WCAG 2 style ratio, so it can be read against
 * the familiar 4.5:1 and 3:1 thresholds.
 */
export function bpca(text: string, background: string): number {
  const lc = bpcaLc(text, background);
  const maxY = Math.max(bpcaY(text), bpcaY(background));

  const offsetA = 0.2693,
    preScale = -0.0561,
    powerShift = 4.537,
    mainFactor = 1.113946,
    loThresh = 0.3,
    loExp = 0.48,
    preEmph = 0.42,
    postDe = 0.6594,
    hiTrim = 0.0785,
    loTrim = 0.0815,
    trimThresh = 0.506; // #c0c0c0

  let addTrim = loTrim + hiTrim;
  if (maxY > trimThresh) {
    addTrim = loTrim * ((1 - maxY) / (1 - trimThresh)) + hiTrim;
  }

  const c = Math.max(0, Math.abs(lc) * 0.01);
  let ratio =
    (Math.pow(c + preScale, powerShift) + offsetA) * mainFactor * c + addTrim;

  ratio =
    ratio > loThresh
      ? 10 * ratio
      : c < 0.06
        ? 0
        : 10 * ratio - (Math.pow(loThresh - ratio + preEmph, loExp) - postDe);

  return ratio;
}

/**
 * AA thresholds. Unchanged from WCAG 2 — the point of the bridge is that these
 * numbers still mean what they always meant, they are just now reached by a
 * method that matches perception.
 */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

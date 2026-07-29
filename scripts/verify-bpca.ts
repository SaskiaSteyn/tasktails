/**
 * Checks the BPCA port in src/lib/contrast.ts still agrees with the reference
 * implementation it was taken from (INF-14).
 *
 *   npx tsx --tsconfig tsconfig.json scripts/verify-bpca.ts
 *
 * The `bridge-pca` package cannot be imported as published: src/bridge-pca.js
 * hardcodes `../node_modules/colorparsley/src/colorparsley.js`, a path npm's
 * hoisting never creates, so importing it throws ERR_MODULE_NOT_FOUND. None of
 * the three functions used here touches colorparsley, so the import line is
 * stripped and the module loaded from a temp file. That is the entire
 * workaround — the maths is untouched.
 *
 * Run this after editing the BPCA block in contrast.ts, or after bumping
 * bridge-pca. It exits non-zero on any disagreement.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { bpca, bpcaLc } from "@/lib/contrast";

type Reference = {
  BPCAcontrast: (txtY: number, bgY: number, places?: number) => number;
  bridgeRatio: (
    lc: number,
    txtY: number,
    bgY: number,
    ratioStr?: string,
    places?: number,
  ) => string;
  sRGBtoY: (rgba: number[]) => number;
};

async function loadReference(): Promise<Reference> {
  const source = readFileSync(
    "node_modules/bridge-pca/src/bridge-pca.js",
    "utf8",
  ).replace(/^import .*colorparsley.*$/m, "// import stripped for this check");

  const file = join(mkdtempSync(join(tmpdir(), "bpca-")), "bridge-pca.mjs");
  writeFileSync(file, source);
  return (await import(pathToFileURL(file).href)) as Reference;
}

const toRgb = (hex: string) =>
  hex
    .replace("#", "")
    .match(/../g)!
    .map((h) => parseInt(h, 16));

/**
 * Every token pair the app actually renders, plus the extremes and both
 * polarities — BPCA is asymmetric, so a port can agree on dark-on-light and
 * still be wrong the other way round.
 */
const PAIRS: [string, string, string][] = [
  ["ink on board", "#2E2A26", "#F1E9DC"],
  ["ink-soft on surface", "#524C47", "#FFFFFF"],
  ["ink-faint on board", "#74685A", "#F1E9DC"],
  ["amber-text on surface", "#8C6117", "#FFFFFF"],
  ["sage-text on board", "#357654", "#F1E9DC"],
  ["urgency-text on board", "#BF3A2D", "#F1E9DC"],
  ["violet-text on violet-tint", "#5C5470", "#EEE9F5"],
  ["terracotta on terracotta-tint", "#E27A54", "#FBEAE3"],
  ["terracotta on surface", "#E27A54", "#FFFFFF"],
  ["white on terracotta (reverse)", "#FFFFFF", "#E27A54"],
  ["white on sage (reverse)", "#FFFFFF", "#5FA97E"],
  ["white on violet (reverse)", "#FFFFFF", "#8478C4"],
  ["white on amber (reverse)", "#FFFFFF", "#E5A93C"],
  ["white on urgency (reverse)", "#FFFFFF", "#DB4C3F"],
  ["black on white", "#000000", "#FFFFFF"],
  ["white on black (reverse)", "#FFFFFF", "#000000"],
  ["near-black soft clamp", "#050505", "#FFFFFF"],
  ["identical colours", "#F1E9DC", "#F1E9DC"],
  ["barely different", "#F1E9DC", "#F1E9DD"],
  ["mid grey on mid grey", "#808080", "#7F7F7F"],
];

async function main() {
  const reference = await loadReference();

  let fails = 0;
  for (const [label, text, bg] of PAIRS) {
    const txtY = reference.sRGBtoY(toRgb(text));
    const bgY = reference.sRGBtoY(toRgb(bg));

    const refLc = reference.BPCAcontrast(txtY, bgY);
    const refRatio = parseFloat(reference.bridgeRatio(refLc, txtY, bgY, "", 6));

    const ourLc = bpcaLc(text, bg);
    const ourRatio = bpca(text, bg);

    const ok =
      Math.abs(refLc - ourLc) < 1e-9 && Math.abs(refRatio - ourRatio) < 1e-6;
    if (!ok) fails += 1;

    console.log(
      `${ok ? "ok  " : "FAIL"} ${label.padEnd(32)}` +
        ` Lc ${ourLc.toFixed(4).padStart(9)} (ref ${refLc.toFixed(4).padStart(9)})` +
        `   ratio ${ourRatio.toFixed(4).padStart(8)} (ref ${refRatio.toFixed(4).padStart(8)})`,
    );
  }

  console.log(
    fails
      ? `\n${fails} MISMATCH(ES) — contrast.ts has drifted from bridge-pca`
      : `\nport matches bridge-pca 0.1.6 on all ${PAIRS.length} pairs`,
  );
  process.exit(fails ? 1 : 0);
}

main();

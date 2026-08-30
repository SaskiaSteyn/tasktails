/**
 * Prints the `ART_FOCUS` map in `src/lib/art-focus.ts` — the content box of
 * every animal and accessory SVG inside the shared 1080×1400 canvas, as
 * fractions of that canvas.
 *
 * The art pack draws each accessory at the exact position it occupies *on an
 * animal*, on the same canvas the animal itself uses, so the two layer
 * without any per-species nudging (that's the point of the shared canvas).
 * The side effect is that a lone accessory is mostly empty space — the
 * mandarin occupies 16% × 7% of its file — which is fine on the pet stage and
 * useless in a 44px store thumbnail. `ItemWell` crops to these boxes so a
 * thumbnail shows the item rather than the canvas it was positioned on.
 *
 * Measured off the rendered alpha channel (sharp), not parsed out of the path
 * data — relative path commands make a textual bounding box unreliable, and
 * `getBBox()` needs a browser.
 *
 *   npx tsx scripts/measure-art-focus.ts
 */
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";

import sharp from "sharp";

/**
 * Each pack's canvas ÷ 5 — enough resolution for a fraction rounded to 3
 * decimals, fast enough to sweep 77 files. The food pack (2026-08-30) is
 * drawn square rather than on the animals' 1080×1400 canvas, so it measures
 * against its own; a fraction is only meaningful against the canvas it was
 * measured on (`artCanvasFor()` in `src/lib/pet-art.ts`).
 */
const DIRS: { dir: string; w: number; h: number }[] = [
  { dir: "public/animals/happy", w: 216, h: 280 },
  { dir: "public/accessories", w: 216, h: 280 },
  { dir: "public/food", w: 216, h: 216 },
];

/** Breathing room around the measured box, in canvas fractions, so a crop never shaves the outermost antialiased pixel. */
const MARGIN = 0.015;

async function contentBox(file: string, W: number, H: number) {
  const { data, info } = await sharp(file, { density: 200 })
    .resize(W, H, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      // >8 rather than >0: a fully transparent pixel can still carry a stray
      // alpha of 1–2 from the rasteriser's edge antialiasing.
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const x = clamp(minX / W - MARGIN);
  const y = clamp(minY / H - MARGIN);
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    width: Number(Math.min(1 - x, clamp((maxX + 1) / W + MARGIN - x)).toFixed(3)),
    height: Number(Math.min(1 - y, clamp((maxY + 1) / H + MARGIN - y)).toFixed(3)),
  };
}

async function main() {
  for (const { dir, w, h } of DIRS) {
    console.log(`\n  // ${dir.replace("public", "")}`);
    for (const file of readdirSync(dir).filter((n) => n.endsWith(".svg")).sort()) {
      const box = await contentBox(join(dir, file), w, h);
      const key = basename(file, ".svg");
      console.log(
        `  "${key}": { x: ${box.x}, y: ${box.y}, width: ${box.width}, height: ${box.height} },`,
      );
    }
  }
}

void main();

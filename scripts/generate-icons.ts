/**
 * PWA-05 — rasterises the brand SVGs into the PNG sizes the manifest and
 * `apple-touch-icon` actually need.
 *
 *   npx tsx scripts/generate-icons.ts
 *
 * Why PNGs at all when `icon.svg` already covers every density as a vector
 * (`manifest.ts`'s own `sizes: "any"`): iOS's home-screen install and some
 * Android launchers/task-switchers don't reliably rasterise an SVG manifest
 * icon, and iOS's `apple-touch-icon` link doesn't accept SVG at all. Re-run
 * this whenever `icon.svg` or `icon-maskable.svg` change — nothing else
 * regenerates these automatically, the same one-shot relationship
 * `verify-bpca.ts` has to `contrast.ts`.
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const BRAND_DIR = path.resolve(import.meta.dirname, "..", "public", "brand");

const TARGETS = [
  { src: "icon.svg", out: "icon-192.png", size: 192 },
  { src: "icon.svg", out: "icon-512.png", size: 512 },
  // Apple's own recommended size for a modern device's apple-touch-icon —
  // iOS ignores the manifest entirely for this, it only reads the
  // `<link rel="apple-touch-icon">` tag `layout.tsx`'s `apple` field emits.
  { src: "icon.svg", out: "icon-180.png", size: 180 },
  // 512 is the size Android's adaptive-icon system actually renders from;
  // smaller maskable sizes are optional and skipped here.
  { src: "icon-maskable.svg", out: "icon-maskable-512.png", size: 512 },
];

async function main() {
  await mkdir(BRAND_DIR, { recursive: true });

  for (const { src, out, size } of TARGETS) {
    const svg = await readFile(path.join(BRAND_DIR, src));
    await sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(BRAND_DIR, out));
    console.log(`${out} (${size}x${size}) ← ${src}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

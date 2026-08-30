/**
 * Shrinks `public/backgrounds/` in place. Run with `npx tsx scripts/optimize-backgrounds.ts`.
 *
 * The 2026-08-16 backgrounds pack came out of a vector editor that exports
 * 1080×1080 SVGs containing embedded base64 rasters and per-shape colour-matrix
 * filters — `fish.svg` was 3.8 MB, `carrots.svg` 613 KB, and the whole folder
 * 5.6 MB, for flat two-colour patterns that gzip barely touches (base64 is
 * already entropy-dense: fish gzipped to 2.5 MB). That folder was the single
 * biggest thing on the wire, and the store and customize grids pull many of
 * those tiles at once.
 *
 * Fix: rasterise each file at its native 1080×1080 (so the seamless repeat
 * edges land exactly where they did before) and re-wrap it as a one-`<image>`
 * SVG around a WebP data URI. Same `.svg` path, same Content-Type, same
 * `background-size: 500px` tiling — so no code, no `StoreItem.imageUrl` rows
 * and no migration change. fish.svg: 3.8 MB → 30 KB.
 *
 * ponytail: WebP-in-SVG rather than renaming the files to `.webp`, purely to
 * avoid a data migration over live study rows. If the seed's `imageUrl`s ever
 * change for another reason, drop the wrapper and ship plain `.webp` — it
 * saves the ~33% base64 inflation and lets `next/image` optimise them.
 *
 * Note librsvg (what sharp uses) cannot decode WebP inside `<image>`, so a
 * re-render of the output through sharp comes back blank. Browsers render it
 * fine — verified in Chrome. Don't "fix" that blank by reverting this.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

const DIR = path.resolve(import.meta.dirname, "..", "public", "backgrounds");

/** Native size of every file in the pack; kept so seamless tiles stay seamless. */
const SIZE = 1080;

/** Already-wrapped files re-rasterise their own raster and lose quality each run. */
const isWrapped = (svg: string) => svg.includes("data:image/webp");

async function wrap(file: string): Promise<string> {
  const webp = await sharp(path.join(DIR, file), { density: 96, limitInputPixels: false })
    .resize(SIZE, SIZE)
    .webp({ quality: 80 })
    .toBuffer();
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
    ` viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">` +
    `<image width="${SIZE}" height="${SIZE}" xlink:href="data:image/webp;base64,${webp.toString("base64")}"/>` +
    `</svg>`
  );
}

const kb = (n: number) => `${Math.round(n / 1024)}K`;

async function main() {
  let before = 0;
  let after = 0;

  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".svg")).sort()) {
    const full = path.join(DIR, file);
    const original = statSync(full).size;
    before += original;

    if (isWrapped(readFileSync(full, "utf8"))) {
      after += original;
      console.log(`${file.padEnd(16)} ${kb(original).padStart(6)}  already wrapped`);
      continue;
    }

    const wrapped = await wrap(file);
    const size = Buffer.byteLength(wrapped);

    // The small pure-vector patterns (retro, triangles, gingham…) are already a
    // few KB and stay crisper as real vectors — rasterising them would grow them.
    if (size >= original) {
      after += original;
      console.log(`${file.padEnd(16)} ${kb(original).padStart(6)}  kept as vector`);
      continue;
    }

    writeFileSync(full, wrapped);
    after += size;
    console.log(`${file.padEnd(16)} ${kb(original).padStart(6)} \u2192 ${kb(size).padStart(6)}`);
  }

  console.log(`\ntotal ${kb(before)} \u2192 ${kb(after)}`);

  // The one thing that must never be true: this script made the folder bigger.
  if (after > before) throw new Error(`grew the folder: ${before} -> ${after}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

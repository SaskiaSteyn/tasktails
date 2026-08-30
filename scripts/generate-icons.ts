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
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const BRAND_DIR = path.resolve(import.meta.dirname, "..", "public", "brand");
const APP_DIR = path.resolve(import.meta.dirname, "..", "src", "app");

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

/**
 * Wraps a PNG in an ICO container — 6-byte ICONDIR, one 16-byte ICONDIRENTRY,
 * then the PNG bytes verbatim, which the format has allowed since Vista.
 *
 * By hand because `sharp` cannot write `.ico` and this is the whole format for
 * a single-image file; a dependency to pack 22 bytes of header would be worse.
 * A width/height byte of 0 means 256 — the largest an ICO can describe.
 */
function pngToIco(png: Buffer): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(0, 6); // width 256
  header.writeUInt8(0, 7); // height 256
  header.writeUInt8(0, 8); // palette size (none)
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18); // offset of the image data
  return Buffer.concat([header, png]);
}

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

  // `src/app/favicon.ico` is Next's file convention (see
  // `node_modules/next/dist/docs/.../app-icons.md`) and is emitted as
  // `<link rel="icon" href="/favicon.ico" sizes="256x256">` *before*
  // `layout.tsx`'s `icons.icon` SVG, so a stale one wins in any browser that
  // prefers the .ico. It was previously left at Next's own default black
  // triangle, which is exactly the miss this line prevents: the file lives
  // outside `public/brand/` and so was never part of a "replace the icons"
  // pass.
  const favicon = await sharp(await readFile(path.join(BRAND_DIR, "icon.svg")), {
    density: 384,
  })
    .resize(256, 256)
    .png()
    .toBuffer();

  await writeFile(path.join(APP_DIR, "favicon.ico"), pngToIco(favicon));
  console.log("favicon.ico (256x256) ← icon.svg");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

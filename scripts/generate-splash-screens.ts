/**
 * PWA-06 — generates the `apple-touch-startup-image` PNGs iOS needs to avoid
 * a blank white flash between tapping the home-screen icon and first paint.
 *
 *   npx tsx scripts/generate-splash-screens.ts
 *
 * Unlike Android/Chrome, iOS never generates a launch splash from the
 * manifest (`background_color` + an icon) — it only ever shows one of these,
 * matched by an exact `(device-width) and (device-height) and
 * (-webkit-device-pixel-ratio) and (orientation)` media query, and shows
 * nothing (a blank white screen) if none matches. There is no wildcard.
 *
 * Each image is exactly what the equivalent Android/Chrome splash already
 * is, by design — `manifest.ts`'s own doc comment: "The generated launch
 * splash draws this icon on that [background_color]". Same background, same
 * icon, same idea, just literal pixels instead of the browser compositing it
 * for us.
 *
 * The device table lives in `src/lib/apple-splash-screens.ts`, not here —
 * `layout.tsx` needs the same list to emit the matching `<link>` tags, and
 * that file can't afford to import `sharp` (a devDependency, native
 * bindings) into the server bundle just to read some numbers back out of it.
 * Re-run this whenever that list changes or `icon.svg` does — nothing
 * regenerates these automatically, the same relationship `generate-icons.ts`
 * (PWA-05) has to `icon.svg`.
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { DEVICES, pixelDimensions, splashFileName } from "@/lib/apple-splash-screens";

const BRAND_DIR = path.resolve(import.meta.dirname, "..", "public", "brand");
const SPLASH_DIR = path.join(BRAND_DIR, "splash");

const BACKGROUND_COLOR = "#F1E9DC"; // manifest.ts's `background_color`.
const ICON_SVG = "icon.svg";
const ICON_SCALE = 0.28; // Icon width as a fraction of the shorter physical side.

async function main() {
  await mkdir(SPLASH_DIR, { recursive: true });
  const iconSvg = await readFile(path.join(BRAND_DIR, ICON_SVG));

  const seen = new Set<string>();
  for (const device of DEVICES) {
    const { pixelWidth, pixelHeight } = pixelDimensions(device);
    const key = `${pixelWidth}x${pixelHeight}`;
    // A duplicate physical size (two devices sharing one screen) would just
    // mean generating and linking the same file twice — skip it outright.
    if (seen.has(key)) continue;
    seen.add(key);

    const iconSize = Math.round(Math.min(pixelWidth, pixelHeight) * ICON_SCALE);
    const icon = await sharp(iconSvg, { density: 384 }).resize(iconSize, iconSize).toBuffer();

    const fileName = splashFileName(pixelWidth, pixelHeight);
    await sharp({
      create: {
        width: pixelWidth,
        height: pixelHeight,
        channels: 3,
        background: BACKGROUND_COLOR,
      },
    })
      .composite([{ input: icon, gravity: "center" }])
      .png()
      .toFile(path.join(SPLASH_DIR, fileName));

    console.log(`${fileName} ← ${device.width}x${device.height} @${device.ratio}x`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * PWA-06 — the iPhone device table `scripts/generate-splash-screens.ts`
 * renders from and `src/app/layout.tsx`'s `appleWebApp.startupImage` links
 * against. Split out as its own dependency-free module rather than having
 * `layout.tsx` import straight from the script: the script pulls in `sharp`
 * (a devDependency, native bindings, no business being anywhere near the
 * server bundle), and this way it can't leak in transitively. See the
 * script's own doc comment for why this list is iPhone-portrait only.
 */

export const DEVICES = [
  { width: 375, height: 667, ratio: 2 }, // SE (2nd/3rd gen), 6/7/8
  { width: 414, height: 736, ratio: 3 }, // 6+/7+/8+
  { width: 375, height: 812, ratio: 3 }, // X/XS/11 Pro, 12/13 mini
  { width: 414, height: 896, ratio: 2 }, // XR, 11
  { width: 414, height: 896, ratio: 3 }, // XS Max, 11 Pro Max
  { width: 390, height: 844, ratio: 3 }, // 12/12 Pro, 13/13 Pro, 14
  { width: 428, height: 926, ratio: 3 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { width: 393, height: 852, ratio: 3 }, // 14 Pro, 15/15 Pro, 16
  { width: 430, height: 932, ratio: 3 }, // 14 Pro Max, 15/15 Pro Max, 15 Plus, 16 Plus
  { width: 402, height: 874, ratio: 3 }, // 16 Pro
  { width: 440, height: 956, ratio: 3 }, // 16 Pro Max
] as const;

export function pixelDimensions({
  width,
  height,
  ratio,
}: {
  width: number;
  height: number;
  ratio: number;
}) {
  return { pixelWidth: width * ratio, pixelHeight: height * ratio };
}

export function splashFileName(pixelWidth: number, pixelHeight: number) {
  return `apple-splash-${pixelWidth}x${pixelHeight}.png`;
}

export function splashUrl(pixelWidth: number, pixelHeight: number) {
  return `/brand/splash/${splashFileName(pixelWidth, pixelHeight)}`;
}

/** The `media` attribute value iOS matches a startup-image link against. */
export function splashMediaQuery({
  width,
  height,
  ratio,
}: {
  width: number;
  height: number;
  ratio: number;
}) {
  return `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`;
}

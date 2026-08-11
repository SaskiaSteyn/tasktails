import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

import { auth } from "@/auth";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { DEVICES, pixelDimensions, splashMediaQuery, splashUrl } from "@/lib/apple-splash-screens";
import { settingsForUser } from "@/lib/settings";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

// PWA-06. One `<link rel="apple-touch-startup-image">` per device in
// `DEVICES` — iOS matches these by exact media query and shows a blank white
// screen between the home-screen tap and first paint if none matches, so
// there's no single "default" entry that covers the rest. Deduped by physical
// pixel size for the same reason `generate-splash-screens.ts` dedupes before
// rendering: two devices can share one screen, and linking the same file
// twice would just be noise.
const seenSplashSizes = new Set<string>();
const startupImage = DEVICES.flatMap((device) => {
  const { pixelWidth, pixelHeight } = pixelDimensions(device);
  const key = `${pixelWidth}x${pixelHeight}`;
  if (seenSplashSizes.has(key)) return [];
  seenSplashSizes.add(key);
  return [{ url: splashUrl(pixelWidth, pixelHeight), media: splashMediaQuery(device) }];
});

export const metadata: Metadata = {
  title: "TaskTails",
  description:
    "Turn your to-do list into a cosy sanctuary. Finish tasks, earn coins, and grow a zoo of little friends.",
  // PWA-05. The manifest icons above already cover 16.4+, per this file's own
  // "iOS honours the manifest from 16.4 on" note, but `apple-touch-icon` is
  // the one path every iOS version has always supported for the home-screen
  // icon specifically, manifest support or not — kept as the reliable
  // fallback rather than betting the icon on manifest support alone. PNG
  // only: apple-touch-icon doesn't accept SVG. 180x180 is Apple's own
  // recommended size for a modern device (`scripts/generate-icons.ts`).
  icons: {
    icon: "/brand/icon.svg",
    apple: "/brand/icon-180.png",
  },
  // `appleWebApp.capable` only emits the modern, unprefixed
  // `mobile-web-app-capable` tag in this Next version — confirmed by reading
  // `next/dist/lib/metadata/metadata.js`, which no longer contains the
  // vendor-prefixed `apple-mobile-web-app-capable` at all (the comment this
  // one replaces, from before PWA-11's audit, assumed otherwise). Only
  // pre-11.3 iOS (2018 and earlier) ever required that exact prefixed tag —
  // not a realistic concern for a study running in 2026, so left as a known,
  // accepted gap rather than chased further: `metadata.other` looks like the
  // fix on paper (`resolve-metadata.js` merges it in cleanly) but verified
  // empirically not to render it in this Next version either, and this isn't
  // worth reverse-engineering Next's metadata pipeline over for a device era
  // this old. `statusBarStyle` stays `default`: `black-translucent` runs
  // content under the status bar, and while `viewportFit: "cover"` below plus
  // the safe-area padding in `AppShell` could absorb that, an opaque bar is
  // the safer default for a study instrument nobody will be on hand to debug.
  appleWebApp: {
    capable: true,
    title: "TaskTails",
    statusBarStyle: "default",
    // PWA-06. Same background/icon Android's own generated splash already
    // draws from the manifest (`background_color` + `icon.svg`, centred) —
    // iOS just needs it as literal pixels per device rather than a formula it
    // can compute itself. See `src/lib/apple-splash-screens.ts` and
    // `scripts/generate-splash-screens.ts` for the device list and renderer.
    startupImage,
  },
};

export const viewport: Viewport = {
  themeColor: "#F1E9DC",
  // Lets the board colour run under a notch and the home indicator, which is
  // what makes the `env(safe-area-inset-*)` padding in AppShell and AppHeader do
  // anything at all — without `cover` the insets are always zero (INF-13).
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // PRO-14 — "Reduce motion" is an in-app override on top of the OS setting
  // globals.css already honours via `prefers-reduced-motion`, so it lives on
  // `<html>` itself rather than threaded through every page. Only a signed-in
  // account has a preference to read; a null here (signed out, or no
  // account) just means the attribute is absent and only the OS setting
  // applies, same as before this ticket existed.
  const session = await auth();
  const settings = session?.user?.id
    ? await settingsForUser(session.user.id)
    : null;

  return (
    <html
      lang="en"
      data-reduce-motion={settings?.reduceMotion ? "true" : undefined}
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      {/* `h-full` + `overflow-hidden`, not the old `min-h-full`: pinning the
          body to exactly the viewport height is what lets `AppShell`'s nav
          stay put while its content area scrolls internally instead. With
          `min-h-full` the body grew past the viewport whenever a screen's
          content was tall, and the whole page scrolled — nav included. */}
      <body className="h-full flex flex-col overflow-hidden">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}

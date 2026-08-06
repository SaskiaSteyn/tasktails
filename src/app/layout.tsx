import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

import { auth } from "@/auth";
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

export const metadata: Metadata = {
  title: "TaskTails",
  description:
    "Turn your to-do list into a cosy sanctuary. Finish tasks, earn coins, and grow a zoo of little friends.",
  icons: { icon: "/brand/icon.svg" },
  // iOS honours the manifest from 16.4 on, but `apple-mobile-web-app-capable`
  // is still what makes an older iPhone's "Add to Home Screen" launch
  // standalone rather than in a browser chrome — and standalone is the whole
  // signal `/` switches on (`src/app/manifest.ts`). `statusBarStyle` stays
  // `default`: `black-translucent` runs content under the status bar, and while
  // `viewportFit: "cover"` below plus the safe-area padding in `AppShell` could
  // absorb that, an opaque bar is the safer default for a study instrument
  // nobody will be on hand to debug.
  appleWebApp: {
    capable: true,
    title: "TaskTails",
    statusBarStyle: "default",
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
      <body className="h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}

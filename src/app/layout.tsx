import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

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
};

export const viewport: Viewport = {
  themeColor: "#F1E9DC",
  // Lets the board colour run under a notch and the home indicator, which is
  // what makes the `env(safe-area-inset-*)` padding in AppShell and AppHeader do
  // anything at all — without `cover` the insets are always zero (INF-13).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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

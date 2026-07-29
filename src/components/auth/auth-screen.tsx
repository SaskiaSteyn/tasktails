import Image from "next/image";

import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/cn";

/**
 * Shell shared by the auth screens (Register, Login, the username step).
 *
 * The frame itself — edge-to-edge on a phone, a centred 400px card from `frame:`
 * up — is `AppShell`, so the auth screens and the app screens cannot drift apart
 * (INF-13, NFR-GEN-2). All this adds is the screens' own padding, and the
 * absence of a header or a nav.
 */
export function AuthScreen({ children }: { children: React.ReactNode }) {
  return <AppShell className="px-6 py-[26px]">{children}</AppShell>;
}

/**
 * The terracotta fox-in-badge mark that heads each auth screen. The two frames
 * space it differently (Register 2/14, Login 24/16), so the margins are the
 * screen's to pass in.
 */
export function AuthBrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/icon.svg"
      alt="TaskTails"
      width={60}
      height={60}
      priority
      className={cn("mx-auto block size-[60px]", className)}
    />
  );
}

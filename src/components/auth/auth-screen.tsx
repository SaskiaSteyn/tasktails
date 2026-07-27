import Image from "next/image";

import { cn } from "@/lib/cn";

/**
 * Shell shared by the auth screens (Register, Login).
 *
 * The designs are drawn in a 300×640 phone frame. Mobile-first, that means the
 * white surface goes edge-to-edge; from `sm` up it becomes a centred card of the
 * same proportions sitting on the warm board background (NFR-GEN-2).
 */
export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 justify-center bg-board sm:items-center sm:p-6">
      <div className="flex w-full flex-col bg-surface px-6 py-[26px] sm:min-h-[640px] sm:max-w-[400px] sm:rounded-frame sm:border sm:border-[rgb(46_42_38/0.06)] sm:shadow-card">
        {children}
      </div>
    </main>
  );
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

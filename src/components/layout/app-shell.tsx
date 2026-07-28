import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The global layout frame (INF-12, INF-13).
 *
 * Every screen in the app is the same phone frame: edge-to-edge on a phone, and
 * from `frame:` (480px) up a 400px card centred on the board with the designs'
 * 34px corner radius. That markup had been copied into each screen as it was
 * built — this is the one copy. See the breakpoint note in globals.css for why
 * the switch happens at 480px rather than Tailwind's `sm`.
 *
 * Slots rather than fixed content: `header` is usually `<PersistentHeader />`,
 * but Profile and Settings have their own headers in the designs and pass those
 * instead, and the auth screens pass none. `nav` is where SHR-01's bottom nav
 * will go.
 *
 * Safe-area insets are handled here and in `AppHeader` rather than by each
 * screen: while the frame is edge-to-edge, the bottom of the shell sits under
 * the home indicator on a notched phone, and `nav` would be the first casualty.
 * Above `frame:` the card is inset by its own padding and the insets resolve to
 * zero, so the same markup is correct at both ends.
 */
export function AppShell({
  header,
  nav,
  children,
  className,
}: {
  header?: ReactNode;
  nav?: ReactNode;
  children: ReactNode;
  /** Padding for the content area — the designs vary it per screen. */
  className?: string;
}) {
  return (
    <div className="flex flex-1 justify-center bg-board frame:items-center frame:p-6">
      <div className="flex w-full flex-col bg-surface frame:min-h-[640px] frame:max-w-app frame:overflow-hidden frame:rounded-frame frame:border frame:border-[rgb(46_42_38/0.06)] frame:shadow-card">
        {header}
        <main className={cn("flex flex-1 flex-col", className)}>{children}</main>
        {nav ? (
          <div className="flex-none pb-[env(safe-area-inset-bottom)]">{nav}</div>
        ) : (
          // No nav to absorb it, so the content area clears the home indicator.
          <div
            aria-hidden
            className="h-[env(safe-area-inset-bottom)] flex-none"
          />
        )}
      </div>
    </div>
  );
}

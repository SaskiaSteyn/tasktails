import type { ReactNode } from "react";

import { LevelUpProvider } from "@/components/economy/level-up-provider";
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
 *
 * `nav` stays pinned to the bottom by height, not `position: sticky` — every
 * div from `body` down to `main` is bounded (`h-full`/`min-h-0`/`frame:h-*`
 * rather than `min-h-full`/`min-h-[640px]`), so a screen with more content than
 * fits can only grow `main`'s own scroll area, never the frame itself. Each
 * level needs its own `min-h-0`: a flex item's automatic minimum size is its
 * content size unless something says otherwise, so without it every level down
 * the chain would grow to fit whatever the screen renders and drag `nav` down
 * with it — which is exactly the bug this replaced.
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
    // ECO-07's celebration is mounted here so any screen inside the frame can
    // raise it with `useLevelUp()`. It renders nothing until one fires.
    <LevelUpProvider>
      <div className="flex min-h-0 flex-1 justify-center bg-board frame:items-center frame:p-6">
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface frame:h-[640px] frame:max-w-app frame:rounded-frame frame:border frame:border-[rgb(46_42_38/0.06)] frame:shadow-card">
          {/* WCAG 2.4.1 Bypass Blocks. Only rendered when there is actually a block
            to bypass — on the auth screens the first thing in the tab order is
            already the content, and a skip link there would be one more stop for
            no gain. It earns its keep once SHR-01's nav is on every screen.
            Visually hidden until focused, then it lands on the board above the
            card. */}
          {header || nav ? (
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-1/2 focus:z-50 focus:-translate-x-1/2 focus:rounded-input focus:bg-surface focus:px-4 focus:py-2 focus:text-[13px] focus:font-bold focus:text-ink focus:shadow-card"
            >
              Skip to content
            </a>
          ) : null}
          {header}
          <main
            id="main"
            tabIndex={-1}
            className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", className)}
          >
            {children}
          </main>
          {nav ? (
            <div className="flex-none pb-[env(safe-area-inset-bottom)]">
              {nav}
            </div>
          ) : (
            // No nav to absorb it, so the content area clears the home indicator.
            <div
              aria-hidden
              className="h-[env(safe-area-inset-bottom)] flex-none"
            />
          )}
        </div>
      </div>
    </LevelUpProvider>
  );
}

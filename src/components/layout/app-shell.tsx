import type { ReactNode } from "react";

import { AchievementUnlockProvider } from "@/components/economy/achievement-unlock-provider";
import { LevelUpProvider } from "@/components/economy/level-up-provider";
import { ConnectivityGate } from "@/components/layout/connectivity-gate";
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
 * Safe-area insets are handled in `AppHeader`, in `BottomNav` itself (`nav`'s
 * own `pb-[calc(14px+env(safe-area-inset-bottom))]`), and by the plain spacer
 * below when there's no `nav` — never by guessing a screen-specific padding:
 * while the frame is edge-to-edge, the bottom of the shell sits under the
 * home indicator on a notched phone. Above `frame:` the card is inset by its
 * own padding and the insets resolve to zero, so the same markup is correct
 * at both ends.
 *
 * From `desk:` (900px) up the frame gives way to the desktop shell: the card
 * becomes the full viewport, and `header`/`nav` are hidden because the `(app)`
 * route-group layout is already drawing the universal header and the
 * persistent left rail around this (INF-22). Both slots stay in the DOM rather
 * than being conditionally rendered — the switch is a media query, and nothing
 * here knows the viewport width on the server.
 *
 * `nav` stays pinned to the bottom by height, not `position: sticky` — every
 * div from `body` down to `main` is bounded (`h-full`/`min-h-0`/`frame:h-*`
 * rather than `min-h-full`/`min-h-[640px]`), so a screen with more content than
 * fits can only grow `main`'s own scroll area, never the frame itself. Each
 * level needs its own `min-h-0`: a flex item's automatic minimum size is its
 * content size unless something says otherwise, so without it every level down
 * the chain would grow to fit whatever the screen renders and drag `nav` down
 * with it — which is exactly the bug this replaced.
 *
 * WCAG 2.4.1's skip link is **not** here: it lives in the `(app)` route-group
 * layout, which is the only ancestor that sits above the desktop rail as well
 * as above this. Every screen that has a block worth bypassing is inside that
 * group; the ones that render this shell without one — the auth screens, the
 * onboarding card, the 404 — pass neither `header` nor `nav`, so their first
 * tab stop is already the content.
 *
 * `ConnectivityGate` (SHR-07) wraps `children` only, inside `main` — every
 * screen that renders `AppShell` gets the offline takeover for free, header
 * and nav included, without each one wiring it up separately. The `(auth)`
 * login/register screens don't render `AppShell` at all, so they're outside
 * its reach — deliberate, since the mock's "we'll sync your progress"
 * copy only makes sense once there is progress to sync.
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
    // ECO-07's celebration and the achievement-unlock celebration are both
    // mounted here so any screen inside the frame can raise them with
    // `useLevelUp()`/`useAchievementUnlock()`. Neither renders anything
    // until one fires.
    <LevelUpProvider>
      <AchievementUnlockProvider>
        <div className="flex min-h-0 flex-1 justify-center bg-board frame:items-center frame:p-6 desk:items-stretch desk:bg-surface desk:p-0">
          <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface frame:h-[640px] frame:max-w-app frame:rounded-frame frame:border frame:border-[rgb(46_42_38/0.06)] frame:shadow-card desk:h-full desk:max-w-none desk:rounded-none desk:border-none desk:shadow-none">
            {/* Hidden, not dropped, at desktop widths: the `(app)` layout's
                universal header replaces it there. */}
            <div className="flex-none desk:hidden">{header}</div>
            <main
              id="main"
              tabIndex={-1}
              className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", className)}
            >
              <ConnectivityGate>{children}</ConnectivityGate>
            </main>
            {/* Same as the header above: the left rail is the desktop nav. */}
            <div className="flex-none desk:hidden">
              {nav ?? (
                // No nav to absorb it, so the content area clears the home indicator.
                <div
                  aria-hidden
                  className="h-[env(safe-area-inset-bottom)]"
                />
              )}
            </div>
          </div>
        </div>
      </AchievementUnlockProvider>
    </LevelUpProvider>
  );
}

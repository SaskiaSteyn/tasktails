import type { ReactNode } from "react";

import { AppRail } from "@/components/layout/app-rail";
import { DesktopHeader } from "@/components/layout/desktop-header";
import { NewTaskProvider } from "@/components/tasks/new-task-provider";

/**
 * The desktop shell (INF-22) — a persistent left rail and one universal
 * header wrapped around every signed-in screen, replacing the phone frame's
 * bottom nav and per-screen headers from `desk:` (900px) up.
 *
 * A route-group layout rather than a branch inside `AppShell`, for one
 * concrete reason: the rail and the header both read from the database (the
 * open-task count, the pet-care flag, the economy), and `AppShell` cannot —
 * it is imported by `PetCustomizer`, a client component, so anything it
 * renders would be pulled into the browser bundle. A layout is a server
 * component that renders *above* every page, so it can fetch once, on the
 * server, for all of them. The group is a URL-invisible folder: `/tasks`,
 * `/store`, `/zoo`, `/profile` and `/settings` keep their paths exactly.
 *
 * `/onboarding` is deliberately outside it — the handoff draws that screen
 * with no rail and no header, a single centred card on the warm ground, and
 * the same is true of the `(auth)` screens, the marketing site and the admin
 * dashboard.
 *
 * `NewTaskProvider` sits here because this is the one place both presentations
 * of the nav — the rail's "New task" button and `BottomNav`'s raised "+" —
 * are inside, so ⌘N and the PWA shortcut open a single mounted sheet rather
 * than one per nav.
 *
 * Below `desk:` this renders as a plain pass-through: the rail and header are
 * `hidden`, and `AppShell` still draws its own frame, header and bottom nav.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <NewTaskProvider>
      <div className="flex min-h-0 flex-1">
        {/* WCAG 2.4.1 Bypass Blocks. `AppShell` carries the phone frame's own
            skip link and hides it here, because at these widths the block
            actually worth bypassing is the rail, which sits above it in the
            DOM — so this one has to come first. Both target the same `#main`,
            and only ever one of them is in the accessibility tree. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-1/2 focus:z-50 focus:-translate-x-1/2 focus:rounded-input focus:bg-surface focus:px-4 focus:py-2 focus:text-[13px] focus:font-bold focus:text-ink focus:shadow-card"
        >
          Skip to content
        </a>
        <AppRail />
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <div className="hidden flex-none desk:block">
            <DesktopHeader />
          </div>
          {children}
        </div>
      </div>
    </NewTaskProvider>
  );
}

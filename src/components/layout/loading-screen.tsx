import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The shared parts of every `loading.tsx` in the `(app)` group.
 *
 * A skeleton only does its job if it is the *shape of the screen that is
 * coming* — a generic stack of bars is worse than nothing, because the layout
 * visibly jumps the moment the real content lands. So each section owns a
 * `loading.tsx` drawn from its real components' own classes (`TaskRow`'s
 * `rounded-card border px-[12px] py-[11px]`, `ZooGalleryCard`'s 150px art
 * region, and so on). What lives here is only what genuinely repeats: the
 * frame, and the three header shapes `AppHeader` itself draws.
 *
 * Keep these in step with the components they stand in for. They are
 * deliberately *not* built by rendering the real components with placeholder
 * data — those read the database, and a `loading.tsx` that suspends is a
 * `loading.tsx` that never shows.
 */

/**
 * The phone frame, the nav, and the one live region.
 *
 * `AppShell` and the real `BottomNav`, for the same reason the group-level
 * fallback uses them: on a phone the whole shell lives *inside* the page, so a
 * fallback without it would blank the frame, the header and the nav for the
 * length of the navigation. `BottomNav` reads `usePathname()`, which is
 * already the destination while this renders, so the tab that was tapped
 * lights up immediately — that is the "your tap landed" signal.
 *
 * The live region is a plain `sr-only` span rather than `role="status"` on a
 * wrapper around the blocks: a wrapper would need `display: contents` to stay
 * out of the flex layout, and that has a history of dropping elements from the
 * accessibility tree. One hidden span announces "Loading" once and cannot
 * disturb the geometry it sits next to — which is the whole point here.
 */
export function LoadingScreen({
  header,
  className,
  children,
}: {
  header: ReactNode;
  /** Content padding — pass the same `className` the real screen gives `AppShell`. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <AppShell header={header} nav={<BottomNav />} className={className}>
      <span role="status" className="sr-only">
        Loading
      </span>
      {children}
    </AppShell>
  );
}

/** `AppHeader`'s own bar — warm fill, track border, safe-area-aware top inset. */
function HeaderBar({ children }: { children: ReactNode }) {
  return (
    <header className="flex-none border-b border-border-track bg-warm px-[18px] pt-[calc(6px+env(safe-area-inset-top))] pb-[14px]">
      {children}
    </header>
  );
}

/**
 * `AppHeader`'s greeting variant (the dashboard): greeting over name, coin
 * pill and level disc, then the XP card and streak card row.
 */
export function GreetingHeaderSkeleton() {
  return (
    <HeaderBar>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="h-3 w-[92px] rounded-chip" />
          <Skeleton className="mt-[5px] h-[19px] w-[132px] rounded-chip" />
        </div>
        <div className="flex flex-none items-center gap-2">
          <Skeleton className="h-[30px] w-[76px] rounded-pill" />
          <Skeleton className="size-[34px] rounded-full" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {/* Real borders and fills, skeletons only for the text and the bar —
            the cards themselves are chrome that does not depend on the data,
            so drawing them for real is what stops the header shifting. */}
        <div className="min-w-0 flex-1 rounded-input border border-border-track bg-surface px-[11px] py-2">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-[10px] w-[74px] rounded-chip" />
            <Skeleton className="h-[10px] w-[54px] rounded-chip" />
          </div>
          <Skeleton className="mt-1.5 h-2 w-full rounded-[5px]" />
        </div>
        <div className="flex flex-none flex-col items-center justify-center gap-[3px] rounded-input border border-border-track bg-surface px-3 py-2">
          <Skeleton className="h-[17px] w-5 rounded-chip" />
          <Skeleton className="h-[9px] w-[54px] rounded-chip" />
        </div>
      </div>
    </HeaderBar>
  );
}

/** `AppHeader`'s title variant — screen title, optional trailing control, coin pill. */
export function TitleHeaderSkeleton({
  titleWidth = "w-24",
  action = false,
}: {
  titleWidth?: string;
  action?: boolean;
}) {
  return (
    <HeaderBar>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className={`h-[19px] rounded-chip ${titleWidth}`} />
        <div className="flex flex-none items-center gap-2">
          {action ? <Skeleton className="size-9 rounded-full" /> : null}
          <Skeleton className="h-[30px] w-[76px] rounded-pill" />
        </div>
      </div>
    </HeaderBar>
  );
}

/**
 * The back-chevron header the drill-in screens draw themselves (the sanctuary,
 * Settings, a task detail) — no coin pill, no warm fill.
 */
export function BackHeaderSkeleton({
  titleWidth = "w-28",
  titleHeight = "h-[19px]",
}: {
  titleWidth?: string;
  /** 19px on the sanctuary, 17px on Settings. */
  titleHeight?: string;
}) {
  return (
    <header className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] py-[14px]">
      <Skeleton className="size-[22px] flex-none rounded-chip" />
      <Skeleton className={`rounded-chip ${titleHeight} ${titleWidth}`} />
    </header>
  );
}

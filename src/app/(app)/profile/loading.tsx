import { LoadingScreen } from "@/components/layout/loading-screen";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/profile` and the screens below it (achievements, leaderboard, sell).
 *
 * The header is this screen's own — 56px avatar, name over email over the
 * level and study-ID pills, settings disc on the right — not `AppHeader`'s, so
 * it is drawn inline rather than reusing a shared header skeleton.
 *
 * The body follows the real order: the username card, then PRO-04's "Lifetime"
 * 2×2 `StatsGrid`, then the rank and Buy-XP rows. The overline caption above
 * the grid is a skeleton like everything else — it is short, and a literal
 * "Lifetime" that then re-renders identically would be the only real text on
 * an otherwise blank screen, which reads as a half-broken page rather than a
 * loading one.
 */
export default function Loading() {
  return (
    <LoadingScreen
      header={
        <header className="flex flex-none items-center gap-[13px] border-b border-border-track bg-warm px-[18px] pt-[14px] pb-4">
          <Skeleton className="size-14 flex-none rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-[19px] w-[126px] rounded-chip" />
            <Skeleton className="mt-1 h-[11.5px] w-[168px] rounded-chip" />
            <div className="mt-[6px] flex gap-[5px]">
              <Skeleton className="h-[15px] w-[52px] rounded-pill" />
              <Skeleton className="h-[15px] w-[76px] rounded-pill" />
            </div>
          </div>
          <Skeleton className="size-9 flex-none rounded-full" />
        </header>
      }
      className="px-4 pt-4 pb-[14px] desk:px-[34px] desk:py-7"
    >
      {/* `UsernameCard` — label over value, with its "Change" button. */}
      <div className="flex items-center justify-between gap-3 rounded-card border border-border-track bg-warm px-[13px] py-[11px]">
        <div className="min-w-0">
          <Skeleton className="h-[10px] w-[68px] rounded-chip" />
          <Skeleton className="mt-1 h-[14px] w-[112px] rounded-chip" />
        </div>
        <Skeleton className="h-9 w-[86px] flex-none rounded-btn" />
      </div>

      <div className="mt-4">
        <Skeleton className="mb-[10px] h-[10px] w-[62px] rounded-chip" />
        <div className="grid grid-cols-2 gap-[10px] desk:grid-cols-4 desk:gap-4">
          {[0, 1, 2, 3].map((tile) => (
            <div
              key={tile}
              className="rounded-[13px] border border-border-track bg-warm px-3 py-[11px]"
            >
              <Skeleton className="h-[19px] w-[54px] rounded-chip" />
              <Skeleton className="mt-1 h-[10.5px] w-[76px] rounded-chip" />
            </div>
          ))}
        </div>
      </div>

      {/* The rank row and the Buy-XP / danger rows below it. */}
      <div className="mt-4 flex flex-col gap-[10px]">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-[62px] w-full rounded-card" />
        ))}
      </div>
    </LoadingScreen>
  );
}

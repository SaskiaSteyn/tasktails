import { LoadingScreen, TitleHeaderSkeleton } from "@/components/layout/loading-screen";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/store` and the screens below it (cart, history, lucky box) — STOR-01.
 *
 * Mirrors `StoreBrowser`: the 38px search field, the scrolling category chip
 * row, then the 2-column `gap-[11px]` grid of `StoreItemCard`s. The card
 * copies that component's three real regions — title block, 82px `ItemWell`,
 * bordered price footer — so the grid's row height is right rather than
 * guessed, and the real cards drop straight into the same boxes.
 *
 * The header takes `action` because this screen's header carries the cart icon
 * beside the coin pill.
 */
const CHIPS = ["w-[52px]", "w-[68px]", "w-[58px]", "w-[74px]", "w-[62px]"];
const CARDS = ["w-[78%]", "w-[62%]", "w-[85%]", "w-[54%]", "w-[70%]", "w-[80%]"];

export default function Loading() {
  return (
    <LoadingScreen
      header={<TitleHeaderSkeleton titleWidth="w-[74px]" action />}
      className="p-[14px] desk:overflow-hidden desk:px-8 desk:py-[26px]"
    >
      {/* Search — the field's own border and radius are real chrome, so only
          the icon and placeholder are skeletons. */}
      <div className="mb-[9px] flex flex-none items-center gap-2">
        <div className="flex h-[38px] min-w-0 flex-1 items-center gap-2 rounded-input border border-border-input bg-surface px-4">
          <Skeleton className="size-4 flex-none rounded-chip" />
          <Skeleton className="h-[11px] w-[104px] rounded-chip" />
        </div>
      </div>

      <div className="no-scrollbar -mx-1 -mt-1 mb-[7px] flex flex-none gap-[6px] overflow-x-auto p-1">
        {CHIPS.map((width, i) => (
          <Skeleton key={i} className={`h-[23px] flex-none rounded-pill ${width}`} />
        ))}
      </div>

      <div className="grid grid-cols-2 items-start gap-[11px] desk:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] desk:gap-4">
        {CARDS.map((width, i) => (
          <div
            key={i}
            className="flex w-full flex-col overflow-hidden rounded-card border border-border-track bg-surface"
          >
            <div className="px-[11px] pt-[10px] pb-[9px]">
              <Skeleton className={`h-[13px] rounded-chip ${width}`} />
              <Skeleton className="mt-[5px] h-[10px] w-[48%] rounded-chip" />
            </div>
            {/* `ItemWell` at `size={82}`, full width and square-cornered. */}
            <Skeleton className="h-[82px] w-full flex-none rounded-none" />
            <div className="border-t border-border-track px-[11px] py-[10px]">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-[14px] w-[44px] rounded-chip" />
                <Skeleton className="size-7 flex-none rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </LoadingScreen>
  );
}

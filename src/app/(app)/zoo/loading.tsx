import { LoadingScreen } from "@/components/layout/loading-screen";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/zoo` — PET-01's gallery.
 *
 * Its header is bespoke rather than `AppHeader`'s (the zoo addendum drops the
 * coin pill here), so it is drawn inline instead of reusing a shared header
 * skeleton: title over the "N friends · tap to visit" count line, on the plain
 * surface with no warm fill.
 *
 * The tiles copy `ZooGalleryCard` exactly — `min-h-[244px]`, the warm name
 * strip, its 150px `ART_REGION_HEIGHT` art region, and the two stat bars — and
 * the last cell is the dashed "Adopt another" slot `ZooGrid` always renders.
 * Four tiles is a guess at the count, but the *shape* is not: whatever the real
 * number, the tiles land in these boxes.
 */
export default function Loading() {
  return (
    <LoadingScreen
      header={
        <header className="flex-none border-b border-border-track px-[18px] pt-[14px] pb-3">
          <Skeleton className="h-[19px] w-[104px] rounded-chip" />
          <Skeleton className="mt-1 h-[11px] w-[148px] rounded-chip" />
        </header>
      }
      className="p-[14px] desk:px-[34px] desk:py-7"
    >
      <div className="grid grid-cols-2 gap-3 desk:gap-[22px] xl:grid-cols-3">
        {["w-[64%]", "w-[52%]", "w-[70%]", "w-[58%]"].map((width, i) => (
          <div
            key={i}
            className="flex min-h-[244px] flex-col overflow-hidden rounded-card-lg border border-border-track bg-surface"
          >
            <div className="flex flex-none items-center justify-between gap-2 border-b border-border-track bg-warm px-[11px] py-[9px]">
              <Skeleton className={`h-[15px] rounded-chip ${width}`} />
              <Skeleton className="size-[18px] flex-none rounded-full" />
            </div>
            <Skeleton className="h-[150px] w-full flex-none rounded-none" />
            <div className="flex flex-1 flex-col justify-center gap-[7px] px-[11px] py-[10px]">
              {[0, 1].map((bar) => (
                <div key={bar} className="flex items-center gap-1">
                  <Skeleton className="size-[13px] flex-none rounded-full" />
                  <Skeleton className="h-2 flex-1 rounded-[5px]" />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* `ZooGrid` renders this slot at any pet count, so it belongs here. */}
        <div className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-card-lg border-2 border-dashed border-checkbox">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-3 w-[84px] rounded-chip" />
        </div>
      </div>
    </LoadingScreen>
  );
}

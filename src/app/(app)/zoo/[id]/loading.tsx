import { BackHeaderSkeleton, LoadingScreen } from "@/components/layout/loading-screen";
import { Skeleton, Spinner } from "@/components/ui/skeleton";

/**
 * `/zoo/[id]` — the Sanctuary stage (PET-02), and the customize screen below it.
 *
 * The one screen where a block-shaped skeleton would be actively wrong: it is
 * a single tall card, not a list, and the animal is the whole point of it.
 * So this copies `AnimalCard`'s real box — the stage's own gradient, the name
 * and mood lines, the two stat cards pinned at `mt-auto`, and the
 * Pet / Feed / customize action row at the exact 44px height and 52px icon
 * width the real one uses.
 *
 * **The stage keeps its real gradient rather than shimmering.** It is not
 * data — every sanctuary draws it — so a skeleton block there would flash a
 * grey rectangle and then repaint the same gradient underneath the animal.
 * The spinner sits where the animal will appear, which is the honest signal:
 * that region, and only that region, is what is still loading.
 */
export default function Loading() {
  return (
    <LoadingScreen
      header={<BackHeaderSkeleton titleWidth="w-[92px]" />}
      className="gap-3 px-4 pt-4 pb-4 desk:flex-row desk:gap-[26px] desk:px-8 desk:py-[26px]"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-fit flex-1 flex-col overflow-hidden rounded-card-lg border border-border-track bg-surface">
          <div className="flex flex-1 flex-col items-center bg-linear-to-b from-[#EAF3EC] to-[#F3ECE1] px-4 pt-4 pb-[14px]">
            <Skeleton className="h-[18px] w-[92px] rounded-chip" />
            <Skeleton className="mt-[5px] h-3 w-[58px] rounded-chip" />

            <div className="relative z-10 mt-1.5 flex min-h-0 w-full max-w-[360px] flex-1 items-center justify-center">
              <Spinner size={26} />
            </div>

            <div className="mt-auto flex w-full flex-col gap-[9px]">
              {[0, 1].map((bar) => (
                <div
                  key={bar}
                  className="rounded-input border border-border-track bg-surface px-3 py-[9px]"
                >
                  <Skeleton className="mb-1.5 h-[10.5px] w-[76px] rounded-chip" />
                  <Skeleton className="h-2 w-full rounded-[5px]" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 p-3">
            <Skeleton className="h-11 flex-1 rounded-btn" />
            <Skeleton className="h-11 flex-1 rounded-btn" />
            <Skeleton className="h-11 w-[52px] flex-none rounded-input" />
          </div>
        </div>
      </div>
    </LoadingScreen>
  );
}

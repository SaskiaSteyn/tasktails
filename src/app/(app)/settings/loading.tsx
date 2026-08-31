import { BackHeaderSkeleton, LoadingScreen } from "@/components/layout/loading-screen";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/settings` and `/settings/password`.
 *
 * Settings is a stack of captioned groups — an overline, then a bordered card
 * whose rows are divided by hairlines (`AccountCard`, `SettingsToggleCard`).
 * That divided-card shape is the thing worth drawing: a single flat block per
 * group would collapse three rows into one and jump when the real rows arrive.
 *
 * The header is the 17px back-chevron variant, a size smaller than the
 * sanctuary's 19px — `BackHeaderSkeleton` takes the height for exactly that.
 */
const GROUPS = [
  { rows: 2, caption: "w-[58px]" },
  { rows: 3, caption: "w-[74px]" },
  { rows: 2, caption: "w-[66px]" },
];

export default function Loading() {
  return (
    <LoadingScreen
      header={<BackHeaderSkeleton titleWidth="w-[78px]" titleHeight="h-[17px]" />}
      className="px-4 pt-[10px] pb-[14px] desk:flex-row desk:overflow-hidden desk:p-0"
    >
      <div className="flex flex-col gap-4 desk:gap-[26px] desk:max-w-[960px] desk:px-10 desk:py-[30px]">
        {GROUPS.map((group, i) => (
          <div key={i}>
            <Skeleton className={`mb-[9px] h-[10px] rounded-chip ${group.caption}`} />
            <div className="overflow-hidden rounded-[13px] border border-border-track bg-warm">
              {Array.from({ length: group.rows }, (_, row) => (
                <div
                  key={row}
                  className={`flex items-center justify-between gap-3 px-[13px] py-[10px] ${
                    row < group.rows - 1 ? "border-b border-border-track" : ""
                  }`}
                >
                  <Skeleton className="h-[13px] w-[112px] rounded-chip" />
                  {/* The trailing control alternates between a value/chevron
                      and a 40×23 toggle across these groups; the toggle is the
                      wider of the two, so it sets the row's real height. */}
                  <Skeleton className="h-[23px] w-10 flex-none rounded-pill" />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* The violet "Research participant" note that closes the screen. */}
        <Skeleton className="h-[52px] w-full rounded-[11px]" />
      </div>
    </LoadingScreen>
  );
}

import { GreetingHeaderSkeleton, LoadingScreen } from "@/components/layout/loading-screen";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/tasks` (and the task detail below it) — TASK-01's list.
 *
 * Mirrors `TaskList`'s own box: its `px-4 pt-4 pb-[14px]` padding is on the
 * list, not on `AppShell` (whose className here is the desktop two-column
 * rule), and its rows are a `gap-[9px]` column. Each row copies `TaskRow`'s
 * real classes so nothing shifts when the data lands.
 *
 * The widths below are not decorative: titles of one uniform length read as a
 * table, which is exactly what this screen is not. The second row carries the
 * indented subtask shape `TaskList` nests under a parent task.
 */
const ROWS = ["w-[62%]", "w-[45%]", "w-[71%]", "w-[54%]", "w-[66%]", "w-[49%]", "w-[68%]"];

export default function Loading() {
  return (
    <LoadingScreen
      header={<GreetingHeaderSkeleton />}
      className="desk:flex-col desk:gap-7 desk:px-8 desk:py-[26px] xl:flex-row"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-[9px] px-4 pt-4 pb-[14px] desk:p-0">
        {ROWS.map((width, i) => (
          <div key={i} className="flex flex-col gap-[9px]">
            <TaskRowSkeleton width={width} />
            {/* One expanded parent, as the real list draws its subtasks. */}
            {i === 0 ? <TaskRowSkeleton width="w-[52%]" indent /> : null}
          </div>
        ))}
      </div>
    </LoadingScreen>
  );
}

/** `TaskRow`'s shape — check circle, title over tier/date badges, coin value. */
function TaskRowSkeleton({ width, indent }: { width: string; indent?: boolean }) {
  return (
    <div
      className={`flex items-center gap-[11px] rounded-card border border-border-track px-3 py-[11px] ${
        indent ? "ml-8 bg-surface" : "bg-warm"
      }`}
    >
      <Skeleton className="size-[22px] flex-none rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className={`h-[13px] rounded-chip ${width}`} />
        {/* A subtask row carries no tier or date badges, so it is one line
            shorter — the same difference `TaskRow` draws. */}
        {indent ? null : (
          <div className="mt-1 flex items-center gap-[7px]">
            <Skeleton className="h-[15px] w-[46px] rounded-chip" />
            <Skeleton className="h-[11px] w-[42px] rounded-chip" />
          </div>
        )}
      </div>
      <Skeleton className="h-[14px] w-[26px] flex-none rounded-chip" />
    </div>
  );
}

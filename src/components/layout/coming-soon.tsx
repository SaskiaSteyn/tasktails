import type { LucideIcon } from "lucide-react";

/**
 * Placeholder body for a nav destination whose real screen hasn't shipped yet
 * (`/store` — STOR-01, `/zoo` — PET-01). `BottomNav` (SHR-01) has linked to
 * both since it was built, on the same "forward-declared route" pattern
 * `/tasks` used before TASK-01 existed — until now, following either tab hit
 * Next's default unstyled 404.
 *
 * Same visual language as `EmptyTasksState` (SHR-04): dashed icon tile,
 * Fredoka heading, muted supporting line. No action button — unlike an empty
 * task list, there's nothing here yet to *do*, just somewhere to come back to.
 */
export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div
        aria-hidden
        className="mb-4 flex size-16 items-center justify-center rounded-card-lg border-2 border-dashed border-checkbox bg-input"
      >
        <Icon size={26} strokeWidth={1.8} className="text-ink-faint" />
      </div>
      <p className="font-display text-[17px] font-semibold">{title}</p>
      <p className="mt-[6px] max-w-[230px] text-[12.5px] text-ink-soft">
        {description}
      </p>
    </div>
  );
}

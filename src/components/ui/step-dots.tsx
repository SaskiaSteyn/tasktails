import { cn } from "@/lib/cn";

/**
 * Progress pips for a multi-step flow — the active step is a 22×6 terracotta
 * pill, the rest are 6px dots (handoff addendum §1).
 */
export function StepDots({
  total,
  current,
  className,
}: {
  total: number;
  /** 1-based. */
  current: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center gap-[5px]", className)}
      role="img"
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-[6px] rounded-pill transition-all duration-120",
            index + 1 === current ? "w-[22px] bg-terracotta" : "w-[6px] bg-step-idle",
          )}
        />
      ))}
    </div>
  );
}

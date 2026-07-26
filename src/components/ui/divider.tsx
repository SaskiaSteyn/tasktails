import { cn } from "@/lib/cn";

/** Hairline rule with centred caption — the "or sign up with" separator. */
export function Divider({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-[10px]", className)}>
      <span className="h-px flex-1 bg-border-input" />
      <span className="text-[11px] font-bold text-ink-faint">{label}</span>
      <span className="h-px flex-1 bg-border-input" />
    </div>
  );
}

"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeNavHref, NAV_ITEMS } from "@/components/layout/nav-items";
import { useNewTask } from "@/components/tasks/new-task-provider";
import { cn } from "@/lib/cn";

/**
 * The interactive half of the desktop rail (INF-22) — the "New task" button
 * and the nav rows. Split from `AppRail` only so that component can stay a
 * server component and read the open-task count and pet-care flag straight
 * from the database, the same split `LogoutButton`/`LogoutSubmit` uses.
 *
 * Two widths, one markup: the base classes are the handoff's 76px icon rail
 * (labels visually hidden, active pill kept), and `xl:` restores the 248px
 * labelled rail. Nothing is conditionally rendered between them — a
 * destination that vanished at one width would be a destination a tablet
 * participant cannot reach, which is worse than a slightly fuller icon
 * column than the mock draws.
 */
export function RailNav({
  openTasks,
}: {
  /** Badge on the Tasks row — tasks not yet completed. */
  openTasks: number;
}) {
  const pathname = usePathname();
  const active = activeNavHref(pathname);
  const { open } = useNewTask();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex h-11 w-11 flex-none items-center justify-center gap-[9px] rounded-btn bg-terracotta font-display text-[15px] font-semibold text-white shadow-btn transition-colors duration-120 hover:bg-terracotta-hover xl:h-[46px] xl:w-full xl:justify-start xl:px-[14px]"
      >
        <Plus size={18} strokeWidth={2.4} aria-hidden className="flex-none" />
        <span className="sr-only xl:not-sr-only">New task</span>
        {/* The shortcut hint the handoff draws on this button. `aria-hidden`
            because "⌘N" read aloud is noise — `NewTaskProvider` binds the
            real chord, and the button itself is already reachable by tab. */}
        <span
          aria-hidden
          className="ml-auto hidden rounded-chip bg-white/20 px-[6px] py-[2px] font-sans text-[11px] font-extrabold xl:block"
        >
          ⌘N
        </span>
      </button>

      <nav aria-label="Main" className="flex flex-col items-center gap-1 xl:items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const current = href === active;
          const badge =
            href === "/tasks" && openTasks > 0 ? openTasks : null;

          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-11 w-11 flex-none items-center justify-center gap-3 rounded-input text-[14.5px] font-bold transition-colors duration-120",
                "xl:h-auto xl:w-auto xl:justify-start xl:rounded-[11px] xl:px-[13px] xl:py-[11px]",
                current
                  ? "bg-terracotta text-white shadow-nav-active"
                  : "text-ink-soft hover:bg-border-track hover:text-ink",
              )}
            >
              <Icon size={18} strokeWidth={2.1} aria-hidden className="flex-none" />
              <span className="sr-only xl:not-sr-only">{label}</span>

              {badge !== null ? (
                <span
                  aria-hidden
                  className={cn(
                    "ml-auto hidden rounded-pill px-2 py-px text-[11.5px] font-extrabold xl:block",
                    current ? "bg-white/20" : "bg-border-track text-ink-soft",
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

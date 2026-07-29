"use client";

import { CheckSquare, type LucideIcon, PawPrint, Plus, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { CreateTaskSheet } from "@/components/tasks/create-task-sheet";
import { cn } from "@/lib/cn";

const TABS_BEFORE_PLUS = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/store", label: "Store", icon: ShoppingBag },
] as const;

const TABS_AFTER_PLUS = [
  { href: "/zoo", label: "Zoo", icon: PawPrint },
  { href: "/profile", label: "Profile", icon: User },
] as const;

/**
 * SHR-01 — floating bottom nav, on every logged-in screen. Four tabs plus a
 * raised "+" in the middle that opens TASK-02's create-task sheet. The
 * sheet's open state lives here, since this is the one thing mounted on
 * every authenticated page — there's no shared layout to hang it on instead.
 *
 * Store (STOR-01) and Zoo (PET-01) don't have pages yet; those tabs link to
 * their eventual routes anyway, the same forward-declared-route pattern
 * TASK-01's `/tasks` redirect used before that page existed.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <nav className="flex items-center justify-center gap-4 bg-surface px-4 pt-2 pb-[14px]">
        {TABS_BEFORE_PLUS.map((tab) => (
          <NavTab key={tab.href} {...tab} active={pathname === tab.href} />
        ))}

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label="New task"
          className="flex size-[46px] flex-none items-center justify-center rounded-full bg-terracotta text-white shadow-fab"
        >
          <Plus size={23} strokeWidth={2.2} aria-hidden />
        </button>

        {TABS_AFTER_PLUS.map((tab) => (
          <NavTab key={tab.href} {...tab} active={pathname === tab.href} />
        ))}
      </nav>

      <CreateTaskSheet open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

function NavTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex size-[42px] flex-none items-center justify-center rounded-full transition-colors duration-120",
        active
          ? "bg-terracotta text-white shadow-nav-active"
          : "border border-border-track bg-surface text-ink-soft shadow-nav-idle",
      )}
    >
      <Icon size={20} strokeWidth={2} aria-hidden />
      <span className="sr-only">{label}</span>
    </Link>
  );
}

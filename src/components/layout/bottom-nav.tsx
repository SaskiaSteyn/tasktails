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
 * Store (STOR-01) doesn't have a real page yet — that tab links to its
 * eventual route anyway, the same forward-declared-route pattern TASK-01's
 * `/tasks` redirect used before that page existed. Zoo got its real pages in
 * PET-01 (`/zoo` the gallery, `/zoo/[id]` the per-animal drill-in) — a tab
 * counts as active on its own route or anything nested under it, which is
 * what actually keeps the Zoo tab lit up while looking at one animal.
 *
 * The root `<nav>` itself carries a 68px fade above its own icon row
 * (`pt-[68px]`, `bg-linear-to-b from-surface/0 to-surface`) rather than
 * `AppShell` wrapping this in an extra div for it — `AppShell`'s `nav` slot
 * is always this component (nothing else is ever passed there), so the fade
 * belongs to the one thing that actually needs it. Both gradient stops are
 * `surface` itself, alpha only — not the bare `transparent` keyword, which
 * has no hue of its own and fades toward an opaque colour through a visibly
 * darker midpoint band (browsers interpolate colour and alpha together).
 * `main` never needs its own matching margin for this: it's `flex-1` in the
 * same flex column as this `<nav>`, so this element's real, non-absolute
 * height (fade included) is space `main` can't claim in the first place —
 * content can't scroll into a zone that was never part of `main`'s own box.
 */
/** A tab is active on its own route and any route nested under it (PET-01's `/zoo/[id]` drill-in). */
function isActiveTab(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <nav className="nav-bar flex flex-none items-center justify-center gap-4 bg-linear-to-b from-surface/0 to-surface p-4">
        {TABS_BEFORE_PLUS.map((tab) => (
          <NavTab key={tab.href} {...tab} active={isActiveTab(pathname, tab.href)} />
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
          <NavTab key={tab.href} {...tab} active={isActiveTab(pathname, tab.href)} />
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
          ? "border-2 border-terracotta bg-surface text-terracotta shadow-nav-idle"
          : "border border-border-track bg-surface text-ink-soft shadow-nav-idle",
      )}
    >
      <Icon size={20} strokeWidth={2} aria-hidden />
      <span className="sr-only">{label}</span>
    </Link>
  );
}

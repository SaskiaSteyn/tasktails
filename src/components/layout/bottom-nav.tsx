"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeNavHref, NAV_ITEMS, type NavItem } from "@/components/layout/nav-items";
import { useNewTask } from "@/components/tasks/new-task-provider";
import { cn } from "@/lib/cn";

/**
 * SHR-01 — floating bottom nav, on every logged-in phone screen. Four tabs
 * plus a raised "+" in the middle that opens TASK-02's create-task sheet.
 *
 * The tabs come from `NAV_ITEMS` (INF-22) rather than from two literal arrays
 * here — this and the desktop rail are two presentations of one nav model, and
 * a list in one place is what stops a route being added to one and forgotten
 * in the other. `bottom: true` marks the four that fit around the "+"; the
 * split into before/after is just the middle of that list.
 *
 * The sheet itself used to be mounted here, since this was the one thing on
 * every authenticated page. It now lives in `NewTaskProvider` in the `(app)`
 * layout, which is above both this and the rail — mounting it here would put
 * a second copy inside a `display:none` subtree at desktop widths, where ⌘N
 * would open it invisibly.
 *
 * The root `<nav>` carries a 68px fade above its own icon row
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
const BOTTOM_TABS = NAV_ITEMS.filter((item) => item.bottom);
const TABS_BEFORE_PLUS = BOTTOM_TABS.slice(0, 2);
const TABS_AFTER_PLUS = BOTTOM_TABS.slice(2);

export function BottomNav() {
  const pathname = usePathname();
  const active = activeNavHref(pathname);
  const { open } = useNewTask();

  return (
    <nav className="nav-bar flex flex-none items-center justify-center gap-4 bg-linear-to-b from-surface/0 to-surface p-4">
      {TABS_BEFORE_PLUS.map((tab) => (
        <NavTab key={tab.href} tab={tab} active={tab.href === active} />
      ))}

      <button
        type="button"
        onClick={open}
        aria-label="New task"
        className="flex size-[46px] flex-none items-center justify-center rounded-full bg-terracotta text-white shadow-fab"
      >
        <Plus size={23} strokeWidth={2.2} aria-hidden />
      </button>

      {TABS_AFTER_PLUS.map((tab) => (
        <NavTab key={tab.href} tab={tab} active={tab.href === active} />
      ))}
    </nav>
  );
}

function NavTab({ tab, active }: { tab: NavItem; active: boolean }) {
  const { href, label, icon: Icon } = tab;

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

"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { ANALYSIS_PAGES } from "./analysis-pages";

/** #329 — the admin side menu: the dashboard, then one entry per analysis page. */
export function AdminNav() {
  const pathname = usePathname();
  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ...ANALYSIS_PAGES.map((page) => ({ ...page, href: `/admin/analysis/${page.slug}` })),
  ];

  return (
    <nav className="flex w-[220px] flex-none flex-col gap-1 border-r border-border-track bg-warm p-4">
      <p className="px-3 pt-2 pb-3 font-display text-[17px] font-semibold text-ink">TaskTails admin</p>
      {links.map(({ href, label, icon: Icon }, index) => (
        <div key={href}>
          {index === 1 ? <p className="text-overline px-3 pt-4 pb-1 text-ink-faint">Analysis</p> : null}
          <Link
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-bold",
              pathname === href ? "bg-violet-tint text-violet-text" : "text-ink-soft hover:bg-surface",
            )}
          >
            <Icon size={16} strokeWidth={2} aria-hidden />
            {label}
          </Link>
        </div>
      ))}
    </nav>
  );
}

"use client";

import { Download, LayoutDashboard, Menu, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import { cn } from "@/lib/cn";

import { ANALYSIS_PAGES } from "./analysis-pages";

const SECTIONS = [
  {
    heading: null,
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    heading: "Analysis",
    links: ANALYSIS_PAGES.map((page) => ({ ...page, href: `/admin/analysis/${page.slug}` })),
  },
];

function Links({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {SECTIONS.map((section) => (
        <div key={section.heading ?? "main"} className="flex flex-col gap-1">
          {section.heading ? (
            <p className="text-overline px-3 pt-4 pb-1 text-ink-faint">{section.heading}</p>
          ) : null}
          {section.links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-bold",
                pathname === href ? "bg-violet-tint text-violet-text" : "text-ink-soft hover:bg-surface",
              )}
            >
              <Icon size={16} strokeWidth={2} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      ))}
      {/* A plain <a>, not <Link>: this is a file download from a route handler, not a page. */}
      <a
        href="/api/admin/export"
        download
        className="mt-4 flex items-center gap-2.5 rounded-[10px] border border-border-track bg-surface px-3 py-2 text-[13px] font-bold text-ink-soft hover:text-ink md:mt-auto"
      >
        <Download size={16} strokeWidth={2} aria-hidden />
        Export CSV
      </a>
    </>
  );
}

/**
 * #329 — the admin menu: a sidebar from `md` up, and on a phone a top bar
 * whose native `<details>` drops the same links down. The drop-down closes
 * itself on navigation, since the layout — and so this component — persists
 * across admin pages.
 */
export function AdminNav() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const current = SECTIONS.flatMap((s) => s.links).find((link) => link.href === pathname);

  return (
    <>
      <details ref={menu} className="group relative z-20 border-b border-border-track bg-warm md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <Menu size={20} strokeWidth={2} className="text-ink-soft" aria-hidden />
          <span className="font-display text-[16px] font-semibold text-ink">TaskTails admin</span>
          {current ? <span className="ml-auto truncate text-[12px] font-bold text-ink-faint">{current.label}</span> : null}
          <span className="sr-only">Menu</span>
        </summary>
        <nav className="absolute inset-x-0 top-full flex flex-col border-b border-border-track bg-warm px-4 pb-4 shadow-card">
          <Links pathname={pathname} onNavigate={() => menu.current?.removeAttribute("open")} />
        </nav>
      </details>

      <nav className="hidden w-[220px] flex-none flex-col border-r border-border-track bg-warm p-4 md:flex">
        <p className="px-3 pt-2 pb-3 font-display text-[17px] font-semibold text-ink">TaskTails admin</p>
        <Links pathname={pathname} />
      </nav>
    </>
  );
}

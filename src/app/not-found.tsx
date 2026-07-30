import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found · TaskTails",
};

/**
 * The global 404 — `design_handoff/ADDENDUM-404.md`. Next.js renders this for
 * any unmatched route automatically (also reachable via `notFound()`), so it
 * needs no route of its own.
 *
 * The addendum's button always reads "Back to tasks", but where it goes
 * depends on whether anyone's signed in: the addendum itself says "routes to
 * the dashboard (or marketing home if logged out)". There's no marketing home
 * yet (MKT-03 is still To Do) — `/` already redirects a visitor to `/register`
 * (`src/app/page.tsx`), so pointing a signed-out participant there rather than
 * hardcoding `/register` here means this page picks up the real marketing
 * home for free once MKT-03 ships, with no change needed in this file.
 *
 * `fullWidth={false}` plus explicit horizontal padding, not the usual
 * full-width CTA: the addendum draws this button hugging its label ("padding
 * 0 28px"), not spanning the frame like every other primary button in the app.
 */
export default async function NotFound() {
  const session = await auth();
  const homeHref = session?.user?.id ? "/tasks" : "/";

  return (
    <AppShell className="flex flex-1 flex-col items-center justify-center px-[26px] text-center">
      <p className="font-display text-[96px] leading-none font-semibold text-terracotta">
        404
      </p>
      <h1 className="mt-4 font-display text-[23px] font-semibold">
        This page wandered off
      </h1>
      <p className="mt-2 max-w-[230px] text-[14px] leading-[1.5] text-ink-soft">
        The page you are looking for doesn&apos;t exist, let&apos;s go back
        home.
      </p>
      <Link
        href={homeHref}
        className={buttonClasses({
          fullWidth: false,
          className: "mt-6 px-[28px]",
        })}
      >
        Back to tasks
      </Link>
    </AppShell>
  );
}

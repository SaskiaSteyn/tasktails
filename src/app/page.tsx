import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MarketingSite } from "@/components/marketing/marketing-site";
import { WelcomeScreen } from "@/components/marketing/welcome-screen";

export const metadata: Metadata = {
  title: "TaskTails — do your tasks, raise a zoo of little friends",
  description:
    "TaskTails turns your to-do list into a game. Complete tasks to earn coins and XP, then spend them feeding, petting and customising your very own sanctuary.",
};

/**
 * The public entry point — MKT-01, MKT-02 and MKT-03, which are one route and
 * two designs rather than three pages.
 *
 * **The split is app vs website, not phone vs desktop.** The welcome screen is
 * the installed PWA's splash: you get it when TaskTails is launched from the
 * home screen, at any size. Everyone who opens the URL in a browser gets the
 * marketing site and logs in from there — a phone browser is still the website,
 * however narrow the screen.
 *
 *   installed app (any width)   welcome screen — edge to edge on a phone, the
 *                               centred 400×640 card from `frame:` up, exactly
 *                               what `AppShell` does to every other screen
 *   browser (any width)         the marketing site, responsive from 320px up
 *
 * This replaced a width-based split (welcome below `lg`, marketing above), which
 * read the handoff's "desktop-first for MKT-01/02, mobile for MKT-03" as a
 * breakpoint. It isn't one — it describes which *frame* each design was drawn
 * in, and the consequence of treating it as a breakpoint was that a phone
 * visiting the public site never saw the marketing page at all, only a splash
 * screen for an app it had no way to install. NFR-GEN-2 asks for both viewports,
 * not one design each.
 *
 * `standalone:` is the manifest's `display: "standalone"` reported back through
 * a media query — see the variant definition in globals.css. CSS, not a hook, so
 * both trees are server-rendered and one is `display: none`: no hydration flash,
 * no JavaScript needed to choose, and nothing to sniff a user agent for.
 *
 * Signed in, there is nothing here for you: `/tasks` is where a session belongs
 * (the same destination `AFTER_LOGIN` in the login page uses), and `/tasks`
 * bounces admins on to `/admin` itself, so this needs no role read of its own.
 * That applies to the app and the website alike — the splash is for launching,
 * not for sitting on top of a live session.
 */
export default async function Home() {
  const session = await auth();
  if (session?.user?.id) redirect("/tasks");

  return (
    <>
      <WelcomeScreen className="hidden standalone:flex" />
      <MarketingSite className="flex standalone:hidden" />
    </>
  );
}

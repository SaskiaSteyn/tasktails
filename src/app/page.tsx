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
 * The handoff draws the marketing site in a ~1180px browser frame and the
 * landing / welcome screen in the same 300×640 phone frame as every app screen,
 * and Module 8 in `Features.md` says so outright: "Desktop-first for MKT-01/02
 * (the only part of the product that is), mobile for MKT-03". They are the same
 * front door at two sizes, so `/` serves whichever fits:
 *
 *   < 480px          welcome screen, edge to edge
 *   480px – 1023px   welcome screen as the centred 400×640 card, exactly what
 *                    `AppShell` does to every other screen at those widths
 *   >= 1024px        the marketing site
 *
 * The switch is CSS, not a media-query hook, so there is no hydration flash and
 * no JavaScript needed to pick — both trees are server-rendered and one is
 * `display: none`. `lg` rather than `frame:` is the cut because 1024px is the
 * narrowest the 1180px desktop layout survives; between the two breakpoints a
 * tablet gets the phone card on the board, which is the app's own answer to
 * that range and not an invention.
 *
 * Signed in, there is nothing here for you: `/tasks` is where a session belongs
 * (the same destination `AFTER_LOGIN` in the login page uses), and `/tasks`
 * bounces admins on to `/admin` itself, so this needs no role read of its own.
 */
export default async function Home() {
  const session = await auth();
  if (session?.user?.id) redirect("/tasks");

  return (
    <>
      <WelcomeScreen className="lg:hidden" />
      <MarketingSite className="hidden lg:flex" />
    </>
  );
}

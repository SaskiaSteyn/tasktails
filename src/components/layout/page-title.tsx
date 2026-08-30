"use client";

import { usePathname } from "next/navigation";

/**
 * The desktop header's page name (INF-22).
 *
 * Derived from the route rather than passed down from each page: the header
 * lives in the `(app)` route-group layout, which renders above every page and
 * therefore cannot be handed a prop by one. A layout has no access to the
 * pathname on the server, so this is the one client component in the desktop
 * chrome. It reads a static table, not the page — nothing here fetches.
 *
 * Every desktop frame in the handoff titles its header with the section name,
 * not with the record on screen ("Petting zoo", not the pet's nickname), which
 * is what makes a table of literals sufficient. Most specific pattern first;
 * the first match wins.
 *
 * This is the page's `h1` on desktop. Each screen keeps its own `h1` in the
 * phone header it renders, which is `display:none` at these widths and so is
 * out of the accessibility tree — exactly one of the two is ever exposed.
 */
const TITLES: [RegExp, string][] = [
  [/^\/tasks$/, "Tasks"],
  [/^\/tasks\/[^/]+$/, "Task detail"],
  [/^\/store$/, "Store"],
  [/^\/store\/cart$/, "Cart"],
  [/^\/store\/history$/, "Purchase history"],
  [/^\/store\/lucky-box$/, "Lucky box"],
  [/^\/store\/lucky-box\/odds$/, "Lucky box odds"],
  [/^\/zoo$/, "Your zoo"],
  [/^\/zoo\/[^/]+$/, "Petting zoo"],
  [/^\/zoo\/[^/]+\/customize$/, "Customise"],
  [/^\/profile$/, "Profile"],
  [/^\/profile\/achievements$/, "Achievements"],
  [/^\/profile\/leaderboard$/, "Leaderboard"],
  [/^\/profile\/sell$/, "Sell items"],
  [/^\/settings$/, "Settings"],
  [/^\/settings\/password$/, "Change password"],
];

export function pageTitleFor(pathname: string): string {
  return TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? "TaskTails";
}

export function PageTitle() {
  return (
    <h1 className="min-w-0 truncate font-display text-[19px] leading-none font-semibold xl:text-[23px]">
      {pageTitleFor(usePathname())}
    </h1>
  );
}

import {
  CheckSquare,
  type LucideIcon,
  PawPrint,
  Settings,
  ShoppingBag,
  Trophy,
  User,
} from "lucide-react";

/**
 * The one nav model, in two presentations (INF-22).
 *
 * SHR-01's floating bottom nav and the desktop rail are the same set of
 * destinations drawn twice — the desktop handoff's own instruction ("the rail
 * and bottom nav are two presentations of the same nav model, so drive both
 * from one route/tab list"). Keeping the list here rather than in either
 * component is what stops a route being added to one and forgotten in the
 * other.
 *
 * `bottom` marks the four tabs the phone nav draws; the rail draws all six.
 * Leaderboard and Settings are rail-only because the bottom nav has exactly
 * four slots around its raised "+" and the designs fill them with these four —
 * on a phone both are reached from Profile, which is where the mobile frames
 * put them.
 */
export type NavItem = {
  href: string;
  /** The rail's label — also the accessible name of the phone nav's icon. */
  label: string;
  icon: LucideIcon;
  /** Drawn in the phone bottom nav as well as the rail. */
  bottom?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare, bottom: true },
  { href: "/store", label: "Store", icon: ShoppingBag, bottom: true },
  { href: "/zoo", label: "Petting zoo", icon: PawPrint, bottom: true },
  { href: "/profile/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User, bottom: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Which single nav row is lit for `pathname` — the *longest* item href that
 * the path is at or nested under, not merely the first that matches.
 *
 * The length tie-break is what the rail needs and the old per-tab predicate
 * could not express: `/profile/leaderboard` is nested under `/profile`, so a
 * plain "starts with" test lights Profile and Leaderboard at once. Returns a
 * href rather than a boolean so both callers ask the question once for the
 * whole list instead of once per row, which is the only way the comparison
 * can be made at all.
 *
 * Nested routes still light their section (PET-01's `/zoo/[id]` drill-in keeps
 * Petting zoo active), which is the behaviour `BottomNav` already had.
 */
export function activeNavHref(pathname: string): string | null {
  return (
    NAV_ITEMS.filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
  );
}

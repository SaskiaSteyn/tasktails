import { CalendarDays, ChartScatter, Filter, type LucideIcon, Timer, Users } from "lucide-react";

/**
 * #329 — the analysis pages, in menu order. The side menu is built from this
 * list and `/admin/analysis/[chart]` renders whichever slug it is given, so
 * adding a chart is one entry here and one case in that page.
 */
export const ANALYSIS_PAGES = [
  { slug: "groups", label: "Group comparison", icon: Users },
  { slug: "earn-spend", label: "Earned vs spent", icon: ChartScatter },
  { slug: "funnel", label: "Store funnel", icon: Filter },
  { slug: "daily", label: "Activity by day", icon: CalendarDays },
  { slug: "flash-sale", label: "Flash-sale days", icon: Timer },
] as const satisfies readonly { slug: string; label: string; icon: LucideIcon }[];

export type AnalysisSlug = (typeof ANALYSIS_PAGES)[number]["slug"];

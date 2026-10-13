import { ListFilter } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ANALYSIS_PAGES, type AnalysisSlug } from "@/components/admin/analysis-pages";
import { DailyActivityCard } from "@/components/admin/daily-activity-card";
import { EarnSpendCard } from "@/components/admin/earn-spend-card";
import { FlashSaleCard } from "@/components/admin/flash-sale-card";
import { GroupComparisonCard } from "@/components/admin/group-comparison-card";
import { RetentionCard } from "@/components/admin/retention-card";
import { StoreFunnelCard } from "@/components/admin/store-funnel-card";
import { requireAdmin, studyDataset } from "@/lib/admin";
import {
  dailyActivity,
  earnSpend,
  flashSaleComparison,
  groupComparisons,
  retention,
  storeFunnel,
  type StudyParticipant,
  withoutOutliers,
} from "@/lib/analysis";
import { cn } from "@/lib/cn";

type Params = { params: Promise<{ chart: string }> };

/** Remembers the "Remove outliers" toggle across analysis pages and reloads. */
const OUTLIER_COOKIE = "admin-exclude-outliers";

/**
 * Read by value, not `has()`: the page re-render that answers this action
 * still sees a just-deleted cookie, with an empty value.
 */
async function excludingOutliers() {
  return (await cookies()).get(OUTLIER_COOKIE)?.value === "1";
}

/** Sets the state the button asked for rather than flipping, so a double-click or a stale tab can't invert it. */
async function setOutliers(form: FormData) {
  "use server";
  const jar = await cookies();
  if (form.get("exclude") === "1") jar.set(OUTLIER_COOKIE, "1", { httpOnly: true, sameSite: "lax" });
  else jar.delete(OUTLIER_COOKIE);
}

function pageFor(slug: string) {
  return ANALYSIS_PAGES.find((page) => page.slug === slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = pageFor((await params).chart);
  return { title: `${page?.label ?? "Analysis"} · Admin · TaskTails` };
}

function render(slug: AnalysisSlug, dataset: StudyParticipant[]) {
  switch (slug) {
    case "groups":
      return <GroupComparisonCard comparisons={groupComparisons(dataset)} />;
    case "earn-spend":
      return <EarnSpendCard data={earnSpend(dataset)} />;
    case "funnel":
      return <StoreFunnelCard data={storeFunnel(dataset)} />;
    case "daily":
      return <DailyActivityCard data={dailyActivity(dataset)} />;
    case "flash-sale":
      return <FlashSaleCard data={flashSaleComparison(dataset)} />;
    case "retention":
      return <RetentionCard data={retention(dataset)} />;
  }
}

/**
 * #329 — one analysis chart per page, picked from the admin side menu.
 * "Remove outliers" re-runs the chart and its tests without the participants
 * `withoutOutliers()` flags, and names them so nothing is dropped silently.
 * It is a cookie rather than a query string so it holds while moving between
 * charts. The CSV export stays raw — exclusion belongs in the
 * write-up's analysis, where it can be reported.
 */
export default async function AnalysisPage({ params }: Params) {
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.status === 401 ? "/login" : "/tasks");

  const page = pageFor((await params).chart);
  if (!page) notFound();

  const excluding = await excludingOutliers();
  const dataset = await studyDataset();
  const { kept, outliers } = excluding ? withoutOutliers(dataset) : { kept: dataset, outliers: [] };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4 p-4 md:gap-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[20px] font-semibold text-ink md:text-[24px]">{page.label}</h1>
        <form action={setOutliers} className="ml-auto">
          <button
            type="submit"
            name="exclude"
            value={excluding ? "0" : "1"}
            aria-pressed={excluding}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px] font-bold",
              excluding
                ? "border-transparent bg-violet-tint text-violet-text"
                : "border-border-track bg-surface text-ink-soft hover:text-ink",
            )}
          >
            <ListFilter size={16} strokeWidth={2} aria-hidden />
            {excluding ? "Show all data" : "Remove outliers"}
          </button>
        </form>
      </div>
      {excluding ? (
        <p className="text-[12px] text-ink-soft">
          {outliers.length === 0
            ? "No outliers — every participant is within 1.5 × IQR of their group on each measure."
            : `Excluding ${outliers.length} of ${dataset.length} participants beyond 1.5 × IQR of their group: `}
          {outliers.map((o, i) => (
            <span key={o.studyId}>
              {i > 0 ? "; " : ""}
              <b className="text-ink">{o.studyId}</b> (Group {o.group}, {o.on.join(", ")})
            </span>
          ))}
        </p>
      ) : null}
      {render(page.slug, kept)}
    </div>
  );
}

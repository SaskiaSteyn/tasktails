import type { Metadata } from "next";
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
} from "@/lib/analysis";

type Params = { params: Promise<{ chart: string }> };

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

/** #329 — one analysis chart per page, picked from the admin side menu. */
export default async function AnalysisPage({ params }: Params) {
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.status === 401 ? "/login" : "/tasks");

  const page = pageFor((await params).chart);
  if (!page) notFound();

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4 p-4 md:gap-6 md:p-8">
      <h1 className="font-display text-[20px] font-semibold text-ink md:text-[24px]">{page.label}</h1>
      {render(page.slug, await studyDataset())}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ANALYSIS_PAGES, type AnalysisSlug } from "@/components/admin/analysis-pages";
import { EarnSpendCard } from "@/components/admin/earn-spend-card";
import { GroupComparisonCard } from "@/components/admin/group-comparison-card";
import { StoreFunnelCard } from "@/components/admin/store-funnel-card";
import { requireAdmin, studyDataset } from "@/lib/admin";
import { earnSpend, groupComparisons, storeFunnel, type StudyParticipant } from "@/lib/analysis";

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
  }
}

/** #329 — one analysis chart per page, picked from the admin side menu. */
export default async function AnalysisPage({ params }: Params) {
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.status === 401 ? "/login" : "/tasks");

  const page = pageFor((await params).chart);
  if (!page) notFound();

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 p-8">
      <h1 className="font-display text-[24px] font-semibold text-ink">{page.label}</h1>
      {render(page.slug, await studyDataset())}
    </div>
  );
}

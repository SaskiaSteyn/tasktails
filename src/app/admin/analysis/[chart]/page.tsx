import { CalendarRange, ListFilter } from "lucide-react";
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
  withinDates,
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

/** The date range's ends, as the `YYYY-MM-DD` a date input gives. Cookies so they hold across pages, like the outlier toggle. */
const FROM_COOKIE = "admin-range-from";
const TO_COOKIE = "admin-range-to";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function dateRange() {
  const jar = await cookies();
  const read = (name: string) => {
    const value = jar.get(name)?.value ?? "";
    return ISO_DATE.test(value) ? value : "";
  };
  return { from: read(FROM_COOKIE), to: read(TO_COOKIE) };
}

async function setDateRange(form: FormData) {
  "use server";
  const jar = await cookies();
  const clear = form.get("clear") === "1";
  for (const [name, field] of [[FROM_COOKIE, "from"], [TO_COOKIE, "to"]] as const) {
    const value = String(form.get(field) ?? "");
    if (!clear && ISO_DATE.test(value)) jar.set(name, value, { httpOnly: true, sameSite: "lax" });
    else jar.delete(name);
  }
}

/** Local midnight at the start of `day`, or `plusDays` after it. ponytail: the server's timezone, which is the study's. */
function startOf(day: string, plusDays = 0) {
  const date = new Date(`${day}T00:00`);
  date.setDate(date.getDate() + plusDays);
  return date;
}

function pageFor(slug: string) {
  return ANALYSIS_PAGES.find((page) => page.slug === slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = pageFor((await params).chart);
  return { title: `${page?.label ?? "Analysis"} · Admin · TaskTails` };
}

function render(slug: AnalysisSlug, dataset: StudyParticipant[], now: Date) {
  switch (slug) {
    case "groups":
      return <GroupComparisonCard comparisons={groupComparisons(dataset)} />;
    case "earn-spend":
      return <EarnSpendCard data={earnSpend(dataset)} />;
    case "funnel":
      return <StoreFunnelCard data={storeFunnel(dataset)} />;
    case "daily":
      return <DailyActivityCard data={dailyActivity(dataset, now)} />;
    case "flash-sale":
      return <FlashSaleCard data={flashSaleComparison(dataset)} />;
    case "retention":
      return <RetentionCard data={retention(dataset, now)} />;
  }
}

/**
 * #329 — one analysis chart per page, picked from the admin side menu.
 * "Remove outliers" re-runs the chart and its tests without the participants
 * `withoutOutliers()` flags, and names them so nothing is dropped silently.
 * It is a cookie rather than a query string so it holds while moving between
 * charts; so is the date range, which limits every chart to activity between
 * two calendar dates. The CSV export stays raw — exclusion belongs in the
 * write-up's analysis, where it can be reported.
 */
export default async function AnalysisPage({ params }: Params) {
  const gate = await requireAdmin();
  if (!gate.ok) redirect(gate.status === 401 ? "/login" : "/tasks");

  const page = pageFor((await params).chart);
  if (!page) notFound();

  const excluding = await excludingOutliers();
  const range = await dateRange();
  const ranged = Boolean(range.from || range.to);
  const end = range.to ? startOf(range.to, 1) : null;
  // Charts that count elapsed study days stop at the range's end, not today.
  const now = end && end < new Date() ? end : new Date();
  // Range first, so outliers are judged on the activity being shown.
  const dataset = withinDates(await studyDataset(), range.from ? startOf(range.from) : null, end);
  const { kept, outliers } = excluding ? withoutOutliers(dataset) : { kept: dataset, outliers: [] };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4 p-4 md:gap-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[20px] font-semibold text-ink md:text-[24px]">{page.label}</h1>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <form
            key={`${range.from}|${range.to}`}
            action={setDateRange}
            className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-ink-soft"
          >
            <CalendarRange size={16} strokeWidth={2} aria-hidden />
            <label className="flex items-center gap-1">
              From
              <input
                type="date"
                name="from"
                defaultValue={range.from}
                className="rounded-[10px] border border-border-track bg-surface px-2 py-[7px] font-normal text-ink"
              />
            </label>
            <label className="flex items-center gap-1">
              To
              <input
                type="date"
                name="to"
                defaultValue={range.to}
                className="rounded-[10px] border border-border-track bg-surface px-2 py-[7px] font-normal text-ink"
              />
            </label>
            <button
              type="submit"
              className="cursor-pointer rounded-[10px] border border-border-track bg-surface px-3 py-2 hover:text-ink"
            >
              Apply
            </button>
            {ranged ? (
              <button
                type="submit"
                name="clear"
                value="1"
                className="cursor-pointer rounded-[10px] border border-transparent bg-violet-tint px-3 py-2 text-violet-text"
              >
                All dates
              </button>
            ) : null}
          </form>
          <form action={setOutliers}>
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
      {ranged && page.slug === "earn-spend" ? (
        <p className="text-[12px] text-ink-soft">
          Coins earned is a lifetime total — only spending is limited to the date range.
        </p>
      ) : null}
      {render(page.slug, kept, now)}
    </div>
  );
}

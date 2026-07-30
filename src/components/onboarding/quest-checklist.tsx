import { Check } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { OnboardingGoal, OnboardingStatus } from "@/lib/onboarding";

/**
 * ONB-01 — the onboarding checklist ("Onboarding · welcome flow" in
 * `design_handoff/TaskTails Screens.dc.html`): the three quests from
 * Requirements ONB-1, each with its live count and bar, under a progress ring
 * summarising all three.
 *
 * Presentational and server-rendered — the counts come from
 * `onboardingStatus()` on the page, so they are correct on first paint rather
 * than filling in after a fetch. None of the three quests can be *finished*
 * from this screen (they need the dashboard, the store and the sanctuary), so
 * there is nothing here to keep live client-side; the screen re-reads whenever
 * it is navigated back to.
 *
 * Departures from the frame, recorded rather than silent. The ring's figure is
 * computed (see `summarise()`) instead of the mock's unexplained 17%. And the
 * goal cards carry a check circle rather than the drawn count-plus-bar: the
 * frame's quests were multi-step ("1/3"), and since all three became one-shot
 * a bar that can only ever read 0% or 100% is a worse answer than a checkbox to
 * the same question. The circle is `TaskRow`'s, at the same 22px, so a done
 * quest and a done task look alike.
 */
export function QuestChecklist({
  name,
  status,
}: {
  /** Greeted in the overline. Their handle, per `displayNameFor()`. */
  name: string;
  status: OnboardingStatus;
}) {
  return (
    <>
      <p className="text-overline text-terracotta">Welcome, {name}</p>
      <h1 className="mt-1 text-section">Your first three quests</h1>
      <p className="mt-1 mb-4 text-secondary text-[12.5px]">
        Finish these to meet your first pet.
      </p>

      <ProgressRing status={status} />

      <ul className="flex flex-col gap-[11px]">
        {status.goals.map((goal) => (
          <GoalCard key={goal.key} goal={goal} />
        ))}
      </ul>

      <div className="flex-1" />

      <Link href="/tasks" className={buttonClasses()}>
        Let&apos;s go
      </Link>
    </>
  );
}

/** The summary card: 52px ring, 38px white centre, title and count beside it. */
function ProgressRing({ status }: { status: OnboardingStatus }) {
  const degrees = (status.percent / 100) * 360;

  return (
    <div className="mb-4 flex items-center gap-[14px] rounded-card border border-border-track bg-surface p-[14px]">
      <div
        className="flex size-[52px] flex-none items-center justify-center rounded-full"
        style={{
          // Dynamic by definition — the sweep is the value being shown.
          background: `conic-gradient(var(--color-sage) 0deg ${degrees}deg, var(--color-border-track) ${degrees}deg 360deg)`,
        }}
      >
        <span className="flex size-[38px] items-center justify-center rounded-full bg-surface font-display text-[13px] font-semibold">
          {status.percent}%
        </span>
      </div>
      <div>
        <p className="text-[14px] font-extrabold">Getting started</p>
        <p className="text-[12px] text-ink-soft">
          {status.complete
            ? "All 3 quests complete"
            : `${status.completed} of ${status.goals.length} quests complete`}
        </p>
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: OnboardingGoal }) {
  return (
    <li className="flex items-center gap-[11px] rounded-card border border-border-track bg-surface px-[14px] py-[13px]">
      <span
        aria-hidden
        className={cn(
          "flex size-[22px] flex-none items-center justify-center rounded-full",
          goal.complete ? "bg-sage" : "border-2 border-checkbox",
        )}
      >
        {goal.complete ? (
          <Check size={13} strokeWidth={3} className="text-white" />
        ) : null}
      </span>
      {/* The circle is decorative; the state is announced here instead, so it
          reads as one phrase rather than a checkbox the user could operate. */}
      <span className="text-body-strong">
        {goal.label}
        <span className="sr-only">{goal.complete ? " — done" : " — not done yet"}</span>
      </span>
    </li>
  );
}

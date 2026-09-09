import { Check, X } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
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
 * goal cards carry a marker rather than the drawn count-plus-bar: the frame's
 * quests were multi-step ("1/3"), and since all three became one-shot a bar
 * that can only ever read 0% or 100% says nothing. That marker started as
 * `TaskRow`'s check circle and is now the quest's number (#251) — the outlined
 * circle read as a checkbox and invited a tap, but no quest can be finished
 * from this screen. Plain divs rather than `ul`/`li` for the same reason: the
 * numbers are a reading order, not a list the user works down.
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
      <div className="flex items-start justify-between gap-2">
        <p className="text-overline text-terracotta">Welcome, {name}</p>
        {/* #251 — a way out at the top, so the list isn't a corridor whose only
            exit is the CTA past the bottom of it. Same destination as "Let's
            go": these quests are finished on the other screens anyway. */}
        <Link
          href="/tasks"
          aria-label="Close"
          className="-mt-2 -mr-2 flex size-9 flex-none items-center justify-center rounded-full text-ink-soft transition-colors duration-120 hover:bg-warm hover:text-ink"
        >
          <X size={18} aria-hidden />
        </Link>
      </div>
      <h1 className="mt-1 text-section">Your first three quests</h1>
      <p className="mt-1 mb-4 text-secondary text-[12.5px]">
        Finish these to meet your first pet.
      </p>

      <ProgressRing status={status} />

      <div className="flex flex-col gap-[11px]">
        {status.goals.map((goal, index) => (
          <GoalCard key={goal.key} goal={goal} number={index + 1} />
        ))}
      </div>

      <div className="flex-1" />

      {/* mt-6, not the bare flex-1 above it: on a short frame the spacer
          collapses to nothing and the CTA sat against the last quest (#251). */}
      <Link href="/tasks" className={buttonClasses({ className: "mt-6" })}>
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

function GoalCard({ goal, number }: { goal: OnboardingGoal; number: number }) {
  return (
    <div className="flex items-center gap-[11px] rounded-card border border-border-track bg-surface px-[14px] py-[13px]">
      <span
        aria-hidden
        className="flex size-[22px] flex-none items-center justify-center font-display text-[14px] font-semibold text-terracotta"
      >
        {goal.complete ? <Check size={15} strokeWidth={3} className="text-sage" /> : number}
      </span>
      {/* The marker is decorative; the state is announced here instead, so it
          reads as one phrase rather than a checkbox the user could operate. */}
      <span className="text-body-strong">
        {goal.label}
        <span className="sr-only">{goal.complete ? " — done" : " — not done yet"}</span>
      </span>
    </div>
  );
}

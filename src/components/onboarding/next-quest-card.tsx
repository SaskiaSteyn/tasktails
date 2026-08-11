import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { OnboardingStatus } from "@/lib/onboarding";

/**
 * ONB-01 — the checklist's second home, on the dashboard.
 *
 * Without this the three quests are a dead end: "Let's go" leaves the
 * onboarding screen and nothing on the dashboard says what is still owed, so a
 * participant who doesn't think to navigate back never finds out. That matters
 * more here than in a normal app — the quests are what get someone far enough
 * into the economy for the study's stimuli to mean anything.
 *
 * One quest at a time, not all three. The persistent header above already
 * carries coins, level, the XP bar and the streak; a second three-row block
 * under it would push the actual task list below the fold on a 640px frame,
 * which is the screen the participant is meant to be using. The card links
 * through to `/onboarding` for the full list, so nothing is hidden — just not
 * all shown at once.
 *
 * Renders nothing once all three are met: at that point it is spent, and the
 * dashboard should be the dashboard.
 */
export function NextQuestCard({ status }: { status: OnboardingStatus }) {
  if (status.complete) return null;

  const index = status.goals.findIndex((goal) => !goal.complete);
  const goal = status.goals[index];

  return (
    // The screen's horizontal padding is carried here rather than by the page,
    // so that returning null takes the surrounding gap with it — a bare wrapper
    // left behind would double the space above the task list.
    <Link
      href="/onboarding"
      aria-label={`Quest ${index + 1} of ${status.goals.length}: ${goal.label}. See all quests.`}
      // `text-ink` is not redundant: the base stylesheet colours every `<a>`
      // terracotta, and the quest label sets no colour of its own, so without
      // this the card's title reads as a link the way body copy shouldn't.
      className="mx-4 mt-4 block flex-none rounded-card border border-border-track bg-warm px-3 py-[11px] text-ink transition-colors duration-120 hover:border-checkbox"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-overline">
          Quest {index + 1} of {status.goals.length}
        </span>
        <ChevronRight size={15} className="text-ink-faint" aria-hidden />
      </div>

      {/* No bar and no count: every quest is one-shot now, and the card only
          ever shows one that isn't done — so a bar here could only ever read
          empty. The label alone is the whole message. */}
      <p className="mt-[3px] text-body-strong">{goal.label}</p>
    </Link>
  );
}

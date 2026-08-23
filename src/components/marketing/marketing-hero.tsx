import { Drumstick, Heart, type LucideIcon, PawPrint, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { InstallButton } from "@/components/marketing/install-button";
import { buttonClasses } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";
import { ANIMAL_SHADOW } from "@/lib/pet-art";
import { MOOD_COPY, moodFor, STATE_TEXT_CLASS, type StateTone, stateTone } from "@/lib/pet-mood";

/**
 * MKT-01 — the marketing hero ("Marketing site — desktop landing" in
 * `design_handoff/TaskTails Screens.dc.html`): eyebrow badge, headline, body,
 * two CTAs and the hero phone.
 *
 * Departures, recorded rather than silent:
 *
 * **"Watch demo" removed 2026-08-10 at the user's request** ("let's remove
 * the watch demo button for now"), while PWA-07's install button was being
 * added to this same row. It pointed at `#how-it-works`, which is still a
 * real section (reachable from the nav) — only the hero's own link to it is
 * gone. Its original rationale, kept here rather than deleted in case it
 * comes back: there is no demo video, and on a deception-study instrument a
 * button that promises a recording and delivers a dead `#` is exactly the
 * small lie the study is about, so it went to the section that does show how
 * the product works rather than to a placeholder.
 *
 * **The frame's avatar stack and "2,400+ students building better habits" are
 * not built.** They were, briefly, on the reasoning that fabricated social proof
 * shown identically to both arms before signup is a constant rather than a
 * stimulus. The user removed them: the claim is simply untrue, and a study whose
 * subject is manufactured pressure should not open by manufacturing any. Do not
 * reinstate them from the frame — this absence is deliberate. If real numbers
 * ever exist, real numbers can go here.
 */

export function MarketingHero() {
  return (
    <section className="bg-warm">
      {/* Stacks below `lg`, where the 288px phone and a 460px column of body
          copy stop fitting side by side. `items-center` only applies once they
          are a row — stretched full-width children in a column would centre
          nothing and stretch the phone. */}
      <div className="mx-auto flex max-w-site flex-col gap-10 px-5 py-12 lg:flex-row lg:items-center lg:px-10 lg:py-16">
        {/* Centred while stacked, left-aligned once the hero is a row — the
            frame only ever draws the row. Left-aligned copy sitting under a
            centred phone reads as a mistake rather than a choice. */}
        <div className="flex-1 text-center lg:text-left">
          <p className="mb-5 inline-flex items-center gap-[3px] rounded-pill bg-terracotta-tint px-[13px] py-[6px] text-[12px] font-extrabold tracking-[1px] text-terracotta">
            <PawPrint size={14} strokeWidth={2.2} aria-hidden />
            PRODUCTIVITY, BUT COSY
          </p>

          {/* The frame's line breaks are load-bearing at 58px — they are what
              make "little friends." its own terracotta line. Below `sm` they are
              dropped (`max-sm:hidden` on the breaks) so the headline wraps to
              the column instead of breaking at points chosen for a much wider
              measure. */}
          <h1 className="font-display text-[34px] leading-[1.06] font-semibold tracking-[-0.5px] sm:text-[44px] lg:text-[58px] lg:leading-[1.03] lg:tracking-[-1px]">
            Do your tasks.
            <br className="max-sm:hidden" />
            {" "}
            Raise a zoo of
            <br className="max-sm:hidden" />
            {" "}
            <span className="text-terracotta">little friends.</span>
          </h1>

          <p className="mx-auto mt-4 mb-7 max-w-[460px] text-[15px] leading-[1.55] text-ink-soft sm:text-[17px] lg:mx-0 lg:mt-[22px] lg:mb-[30px]">
            TaskTails turns your to-do list into a game. Complete tasks to earn
            coins and XP, then spend them feeding, petting and customising your
            very own sanctuary.
          </p>

          {/* A flex container: `text-center` on the parent moves inline text, not
              flex items, so the row needs its own justification. */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-[14px] lg:justify-start">
            <Link
              href="/register"
              className={buttonClasses({
                size: "hero",
                fullWidth: false,
                className: "px-6 text-[16px] sm:px-7 sm:text-[17px]",
              })}
            >
              Start for free
            </Link>
            <InstallButton />
          </div>
        </div>

        <HeroPhone />
      </div>
    </section>
  );
}

/**
 * Illustrative stats for the phone. Fed through the app's own `moodFor()` and
 * `stateTone()` rather than hard-coding "Happy" and a green bar, so this picture
 * cannot drift from the thresholds the real sanctuary uses — change the numbers
 * and the label, the icon colours and the bar tones all follow, exactly as they
 * would for a participant. 85/35 are the frame's own values.
 */
const HERO_PET = { happiness: 85, hunger: 35 };

/**
 * The sanctuary, drawn as a picture of the app rather than the app.
 *
 * Mirrors `AnimalCard` (PET-01/02) as it actually ships, **not** the hero phone
 * the marketing frame draws. That frame predates the card: it shows one stat
 * bar with a "85%" numeral beside it, and a two-button action row. The real card
 * has two bars — happiness and hunger, the second an inverted *fullness* fill
 * after a participant flagged the raw one as backwards — no numeral on either,
 * and a third fixed-width customize button. A marketing page whose screenshot
 * shows a version of the product that no longer exists is a worse kind of wrong
 * than one a few pixels off its mock, so the card wins over the frame here.
 * Everything outside the card — the phone shell, its shadow — is still the
 * frame's.
 *
 * `aria-hidden` and built from spans: it repeats nothing a screen reader needs
 * (the copy beside it already says what the product does), and "Pet", "Feed" and
 * the customize square are pictures of buttons that must never land in the tab
 * order. They borrow `buttonClasses` so they cannot drift from the real ones.
 */
function HeroPhone() {
  const mood = MOOD_COPY[moodFor(HERO_PET)];
  const happinessTone = stateTone(HERO_PET.happiness);
  // Inverted before it reaches `stateTone()` for the same reason `AnimalCard`
  // does it: low hunger is the good end.
  const hungerTone = stateTone(100 - HERO_PET.hunger);

  return (
    <div
      aria-hidden
      // `mx-auto` centres it once the hero stacks; inert in a row, where
      // `flex-none` fixes the width anyway. `max-w-full` so the fixed 288px
      // can't push the page sideways on a 320px screen.
      className="mx-auto flex h-[500px] w-[288px] max-w-full flex-none flex-col overflow-hidden rounded-frame border border-[rgb(46_42_38/0.08)] bg-surface p-4 shadow-[0_26px_54px_rgb(46_42_38/0.20)]"
    >
      {/* The card, as `/zoo/[id]` frames it: `AppShell`'s `px-4 pt-4` above,
          then `AnimalCard`'s own rounded border. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card-lg border border-border-track bg-surface">
        {/* Same two gradient stops as the real stage — neither is a token there
            either, and a picture of the sanctuary that is a different green from
            the sanctuary is worse than a raw hex. */}
        <div className="flex min-h-0 flex-1 flex-col items-center bg-linear-to-b from-[#EAF3EC] to-[#F3ECE1] px-4 pt-4 pb-[14px]">
          <p className="font-display text-[18px] font-semibold">Mochi</p>
          <p className={cn("mt-[3px] text-[12px] font-extrabold", mood.className)}>
            {mood.label}
          </p>

          <div className="relative mt-1.5 min-h-0 w-full flex-1">
            {/* Same drop shadow the real stage gives the animal
                (`ANIMAL_SHADOW.stage`, via `PetArt`) — this is a picture of
                the Sanctuary, and the same "a mock that differs from the
                screen is worse than duplicating a value" reasoning the
                gradient stops above are kept in sync for. Not `PetArt`
                itself: nothing here is a real pet, and the hero has no
                accessory or mood to resolve. */}
            <Image
              src="/animals/happy/fox.svg"
              alt=""
              fill
              sizes="224px"
              className={cn("object-contain", ANIMAL_SHADOW.stage)}
            />
          </div>

          <div className="mt-auto flex w-full flex-col gap-[9px]">
            <StatMeter
              icon={Heart}
              label="HAPPINESS"
              tone={happinessTone}
              value={HERO_PET.happiness}
            />
            {/* Fill is fullness (100 − hunger), matching the real card. */}
            <StatMeter
              icon={Drumstick}
              label="HUNGER"
              tone={hungerTone}
              value={100 - HERO_PET.hunger}
            />
          </div>
        </div>

        {/* Stretched by the wrappers, not by a `flex-1` on the buttons
            themselves — `AnimalCard` explains why it does the same, and this
            phone is only a faithful picture if it is built the same way. */}
        <div className="flex gap-2 p-3">
          <div className="min-w-0 flex-1">
            <span className={buttonClasses({ size: "inline", className: "px-2" })}>
              Pet
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <span
              className={buttonClasses({
                variant: "positive",
                size: "inline",
                className: "px-2",
              })}
            >
              Feed
            </span>
          </div>
          <span className="flex h-11 w-[52px] flex-none items-center justify-center rounded-input border border-border-input bg-input text-ink-soft">
            <Sparkles size={18} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </div>
  );
}

/** One of the card's two stat meters — icon, label and bar all one tone. */
function StatMeter({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: StateTone;
  value: number;
}) {
  return (
    <div className="rounded-input border border-border-track bg-surface px-3 py-[9px]">
      <div className="mb-1.5 flex items-center text-[10.5px] font-extrabold text-ink-soft">
        <span className={cn("flex items-center gap-1", STATE_TEXT_CLASS[tone])}>
          <Icon size={13} strokeWidth={2.2} />
          {label}
        </span>
      </div>
      <ProgressBar tone={tone} value={value} label={label} />
    </div>
  );
}

import { Heart, PawPrint, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

/**
 * MKT-01 — the marketing hero ("Marketing site — desktop landing" in
 * `design_handoff/TaskTails Screens.dc.html`): eyebrow badge, headline, body,
 * two CTAs, the avatar-stack social proof, and the hero phone.
 *
 * Two departures, recorded rather than silent:
 *
 * "Watch demo" points at `#how-it-works`. There is no demo video, and this is a
 * research instrument — a button that promises a recording and delivers nothing
 * is the kind of small deception the study is *about*, so it goes to the section
 * that actually shows how the product works rather than to a dead `#` or a
 * modal with a placeholder in it. The label is the frame's.
 *
 * The avatar stack and "2,400+ students" are fabricated, exactly as drawn. They
 * are safe *because* they are on the marketing page: every participant sees the
 * same page before signup regardless of arm, so this is a constant across A and
 * B rather than a stimulus, and the false-urgency manipulation stays confined to
 * the store where the design puts it. Do not let this precedent creep into any
 * screen behind the login.
 */

/** The four discs in the stack, in drawn order. Purely decorative. */
const AVATARS = ["bg-terracotta", "bg-sage", "bg-violet", "bg-amber"];

export function MarketingHero() {
  return (
    <section className="bg-warm">
      <div className="mx-auto flex max-w-site items-center gap-10 px-10 py-16">
        <div className="flex-1">
          <p className="mb-5 inline-flex items-center gap-[3px] rounded-pill bg-terracotta-tint px-[13px] py-[6px] text-[12px] font-extrabold tracking-[1px] text-terracotta">
            <PawPrint size={14} strokeWidth={2.2} aria-hidden />
            PRODUCTIVITY, BUT COSY
          </p>

          <h1 className="font-display text-[58px] leading-[1.03] font-semibold tracking-[-1px]">
            Do your tasks.
            <br />
            Raise a zoo of
            <br />
            <span className="text-terracotta">little friends.</span>
          </h1>

          <p className="mt-[22px] mb-[30px] max-w-[460px] text-[17px] leading-[1.55] text-ink-soft">
            TaskTails turns your to-do list into a game. Complete tasks to earn
            coins and XP, then spend them feeding, petting and customising your
            very own sanctuary.
          </p>

          <div className="flex items-center gap-[14px]">
            <Link
              href="/register"
              className={buttonClasses({
                size: "hero",
                fullWidth: false,
                className: "px-7 text-[17px]",
              })}
            >
              Start for free
            </Link>
            <a
              href="#how-it-works"
              className={buttonClasses({
                variant: "secondary",
                size: "hero",
                fullWidth: false,
                className: "gap-[9px] px-[26px] text-[17px]",
              })}
            >
              <Play size={15} strokeWidth={0} className="fill-current" aria-hidden />
              Watch demo
            </a>
          </div>

          <div className="mt-6 flex items-center gap-[9px]">
            <div aria-hidden className="flex">
              {AVATARS.map((colour, index) => (
                <span
                  key={colour}
                  className={`block size-[30px] rounded-full border-2 border-warm ${colour} ${
                    index === 0 ? "" : "-ml-[9px]"
                  }`}
                />
              ))}
            </div>
            <p className="text-[13px] text-ink-soft">
              <b className="text-ink">2,400+</b> students building better habits
            </p>
          </div>
        </div>

        <HeroPhone />
      </div>
    </section>
  );
}

/**
 * The sanctuary, drawn as a picture of the app rather than the app.
 *
 * `aria-hidden` and built from spans: it repeats nothing a screen reader needs
 * (the copy beside it already says what the product does), the "Pet" and "Feed"
 * blocks are not buttons and must never land in the tab order, and the numbers
 * are illustrative — this is the marketing page, not a session.
 */
function HeroPhone() {
  return (
    <div
      aria-hidden
      className="flex h-[500px] w-[288px] flex-none flex-col overflow-hidden rounded-frame border border-[rgb(46_42_38/0.08)] bg-surface shadow-[0_26px_54px_rgb(46_42_38/0.20)]"
    >
      {/* Same two gradient stops as the real stage in `AnimalCard` — neither is
          a token there either, and a picture of the sanctuary that is a
          different green from the sanctuary is worse than a raw hex. */}
      <div className="flex flex-1 flex-col items-center bg-linear-to-b from-[#EAF3EC] to-[#F3ECE1] pt-[34px]">
        <p className="font-display text-[19px] font-semibold">Mochi</p>
        <p className="mt-[3px] text-[12px] font-extrabold text-sage">Happy</p>

        <Image
          src="/animals/fox.svg"
          alt=""
          width={150}
          height={150}
          className="mt-2 block size-[150px]"
        />

        <div className="mt-auto mb-4 w-4/5 rounded-[11px] border border-border-track bg-surface px-[11px] py-2">
          <div className="mb-[5px] flex items-center justify-between text-[10px] font-extrabold text-ink-soft">
            <span className="flex items-center gap-[3px]">
              <Heart size={13} strokeWidth={2.2} />
              HAPPINESS
            </span>
            <span className="text-sage">85%</span>
          </div>
          <ProgressBar value={85} tone="good" size="sm" label="Happiness" />
        </div>
      </div>

      <div className="flex gap-2 bg-surface p-3">
        <span className="flex h-10 flex-1 items-center justify-center rounded-[11px] bg-terracotta font-display text-[13px] font-semibold text-white">
          Pet
        </span>
        <span className="flex h-10 flex-1 items-center justify-center rounded-[11px] bg-sage font-display text-[13px] font-semibold text-white">
          Feed
        </span>
      </div>
    </div>
  );
}

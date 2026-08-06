import { ListChecks, PawPrint, Sparkles, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";

/**
 * MKT-02 — everything below the hero on the marketing site ("Marketing site —
 * desktop landing" in `design_handoff/TaskTails Screens.dc.html`): the
 * three-column feature grid, the "Three steps" how-it-works band, the closing
 * CTA and the dark footer.
 *
 * The icon wells carry Lucide marks where the frame draws bare geometry — an
 * amber rounded square, a violet diamond, a sage circle. Same call, for the same
 * reason, as the chips on the welcome screen (`welcome-screen.tsx`): the shapes
 * are shorthand for the icon set AGENTS.md pins to lucide-react.
 *
 * `#the-zoo` is the nav's third link and has no section of its own in the frame,
 * which draws the nav and the page separately. It anchors here, on the "Your own
 * sanctuary" card — the only place on the page that is about the zoo. The
 * alternative, inventing a whole zoo section the design does not draw, is a
 * bigger departure than reusing a card that already says the right thing.
 */

const FEATURES: {
  icon: LucideIcon;
  /** Well fill + mark colour. The frame tints each well to its own accent. */
  well: string;
  mark: string;
  title: string;
  body: string;
  id?: string;
}[] = [
  {
    icon: ListChecks,
    well: "bg-amber-tint",
    mark: "text-amber-text",
    title: "Tasks & subtasks",
    body: "Due dates, five complexity tiers and nested subtasks. Every finish pays out coins and XP.",
  },
  {
    icon: Sparkles,
    well: "bg-violet-tint",
    mark: "text-violet",
    title: "Levels & streaks",
    body: "Build a daily streak, climb levels, and unlock rarer animals and accessories as you grow.",
  },
  {
    icon: PawPrint,
    well: "bg-sage-tint",
    mark: "text-sage-text",
    title: "Your own sanctuary",
    body: "Spend coins in the store, then feed, pet and customise a zoo of creatures with real moods.",
    id: "the-zoo",
  },
];

const STEPS = [
  {
    disc: "bg-terracotta",
    title: "Add your tasks",
    body: "Capture to-dos, set a size and due date. That's it.",
  },
  {
    disc: "bg-amber",
    title: "Finish & earn",
    body: "Check things off to bank coins and XP, and keep your streak alive.",
  },
  {
    disc: "bg-sage",
    title: "Grow your zoo",
    body: "Spend rewards on animals and treats, and watch them thrive.",
  },
];

export function MarketingFeatures() {
  return (
    // `scroll-mt` so the sticky nav does not cover the heading the anchor lands
    // on. The nav is 77px tall from `md` up and 56px below it (smaller logo,
    // tighter padding), so the offset shrinks with it — one fixed value would
    // either overlap on desktop or leave a visible gap on a phone.
    <section id="features" className="scroll-mt-[68px] md:scroll-mt-[88px]">
      <div className="mx-auto max-w-site px-5 pt-12 pb-4 text-center md:px-10 md:pt-16 md:pb-5">
        <h2 className="font-display text-[27px] font-semibold sm:text-[32px] md:text-[36px]">
          Everything you need to stay on track
        </h2>
        <p className="mt-[10px] text-[15px] text-ink-soft md:text-[16px]">
          A real task manager underneath the fluff — with rewards that actually
          make you come back.
        </p>
      </div>

      <ul className="mx-auto grid max-w-site grid-cols-1 gap-4 px-5 pt-6 pb-10 md:grid-cols-3 md:gap-5 md:px-10 md:pt-[34px] md:pb-14">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            id={feature.id}
            className="scroll-mt-[68px] rounded-card-lg border border-border-track bg-warm p-5 md:scroll-mt-[88px] md:p-[26px]"
          >
            <span
              className={`mb-4 flex size-[52px] items-center justify-center rounded-[14px] ${feature.well} ${feature.mark}`}
            >
              <feature.icon size={24} strokeWidth={2.2} aria-hidden />
            </span>
            <h3 className="mb-[7px] font-display text-[20px] font-semibold">
              {feature.title}
            </h3>
            <p className="text-[14px] leading-[1.55] text-ink-soft">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MarketingHowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-[68px] bg-warm md:scroll-mt-[88px]">
      <div className="mx-auto max-w-site px-5 py-12 md:px-10 md:py-[60px]">
        <h2 className="mb-8 text-center font-display text-[27px] font-semibold sm:text-[32px] md:mb-11 md:text-[36px]">
          Three steps to a happier list
        </h2>

        <ol className="mx-auto flex max-w-[980px] flex-col gap-8 md:flex-row md:gap-[26px]">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex-1 text-center">
              <span
                aria-hidden
                className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full font-display text-[24px] font-semibold text-white ${step.disc}`}
              >
                {index + 1}
              </span>
              <h3 className="mb-[6px] font-display text-[19px] font-semibold">
                {step.title}
              </h3>
              <p className="text-[14px] leading-[1.5] text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function MarketingClosingCta() {
  return (
    <section className="mx-auto max-w-site px-5 py-14 text-center md:px-10 md:py-[70px]">
      <h2 className="font-display text-[29px] leading-[1.1] font-semibold sm:text-[36px] md:text-[42px]">
        Your to-do list has
        <br />
        never been this cute.
      </h2>
      <p className="mt-4 mb-7 text-[15px] text-ink-soft md:text-[16px]">
        Free to start. No card required.
      </p>
      <Link
        href="/register"
        className={buttonClasses({
          size: "hero",
          fullWidth: false,
          className: "h-[54px] px-8 text-[17px] md:text-[18px]",
        })}
      >
        Get started free
      </Link>
    </section>
  );
}

/**
 * The dark footer.
 *
 * The frame draws four items: Privacy, Terms, Contact, and the copyright. The
 * first three have no pages, no tickets and — for a university study instrument
 * that exists for the length of one data-collection round — nothing truthful to
 * put behind them. Three links to nowhere in the footer of a research
 * instrument is worse than three links fewer, so they are replaced by the
 * public destinations the site actually has. The bar, the wordmark, the muted
 * type and the copyright are as drawn. Give them real pages and they go back.
 */
export function MarketingFooter() {
  return (
    // `--focus-ring` again: ink on ink is invisible, and the footer is the one
    // dark ground on this page (globals.css asks each such container to say so).
    <footer
      style={{ "--focus-ring": "#fff" } as React.CSSProperties}
      className="bg-ink"
    >
      <div className="mx-auto flex max-w-site flex-col items-center justify-between gap-5 px-5 py-8 md:flex-row md:gap-0 md:px-10 md:py-[34px]">
        <div className="flex items-center gap-[10px]">
          <Image
            src="/brand/icon-light.svg"
            alt=""
            width={32}
            height={32}
            className="block size-8 flex-none rounded-[9px]"
          />
          <span className="font-display text-[17px] font-semibold text-white">
            TaskTails
          </span>
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-on-dark-soft md:gap-x-[26px]">
          <li>
            <a href="#features" className="text-on-dark-soft hover:text-white">
              Features
            </a>
          </li>
          <li>
            <Link href="/login" className="text-on-dark-soft hover:text-white">
              Log in
            </Link>
          </li>
          <li>
            <Link href="/register" className="text-on-dark-soft hover:text-white">
              Get started
            </Link>
          </li>
          <li>© {new Date().getFullYear()} TaskTails</li>
        </ul>
      </div>
    </footer>
  );
}

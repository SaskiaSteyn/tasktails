import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import {
  MarketingClosingCta,
  MarketingFeatures,
  MarketingFooter,
  MarketingHowItWorks,
} from "@/components/marketing/marketing-sections";
import { cn } from "@/lib/cn";

/**
 * MKT-01 + MKT-02 — the desktop marketing site, assembled.
 *
 * Its own scroll container, not the window's: the root layout pins `<body>` to
 * exactly the viewport height (`h-full overflow-hidden`) so `AppShell`'s bottom
 * nav can stay put while a screen scrolls inside it. This is the first page in
 * the app that is genuinely a long document rather than a phone frame, so it
 * takes the same shape every other screen does — one bounded, internally
 * scrolling column — rather than reaching up and unpinning the body for
 * everyone.
 *
 * That is also why the nav can be `sticky`: sticky resolves against the nearest
 * scrolling ancestor, which here is this div.
 */
export function MarketingSite({
  className,
}: {
  /**
   * Must supply the `display` — the base list deliberately carries `flex-col`
   * without `flex`, so the caller's `hidden lg:flex` is the only thing setting
   * it and the two cannot fight. `cn` is a plain join, not tailwind-merge, so
   * two display utilities would both survive and stylesheet order would decide.
   */
  className?: string;
}) {
  return (
    <div
      // `relative` so the skip link below lands against this container rather
      // than the initial containing block, exactly as it does in `AppShell`.
      //
      // No `scroll-smooth`. It was here and came back out: the anchor links land
      // on the right offset either way, but a smooth scroll that fails to finish
      // leaves the page a few pixels from where it started, which reads as a
      // dead nav rather than as a missing animation — and that is exactly how it
      // behaved in one renderer while this was being checked. An instant jump
      // has no such failure mode, and the frame asks for no animation here.
      className={cn(
        "relative min-h-0 flex-1 flex-col overflow-y-auto bg-surface",
        className,
      )}
    >
      {/* WCAG 2.4.1 Bypass Blocks — the nav is five items deep and repeats on
          nothing else, so it is worth one stop to skip. Same treatment as
          `AppShell`'s: hidden until focused. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-1/2 focus:z-20 focus:-translate-x-1/2 focus:rounded-input focus:bg-surface focus:px-4 focus:py-2 focus:text-[13px] focus:font-bold focus:text-ink focus:shadow-card"
      >
        Skip to content
      </a>

      <MarketingNav />

      <main id="main" tabIndex={-1}>
        <MarketingHero />
        <MarketingFeatures />
        <MarketingHowItWorks />
        <MarketingClosingCta />
      </main>

      <MarketingFooter />
    </div>
  );
}

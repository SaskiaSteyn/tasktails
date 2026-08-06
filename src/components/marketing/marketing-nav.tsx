import Image from "next/image";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";

/**
 * MKT-01 — the marketing site's top nav ("Marketing site — desktop landing" in
 * `design_handoff/TaskTails Screens.dc.html`).
 *
 * Sticky, which the frame cannot show either way — it is drawn as a screenshot
 * of the top of the page. Three of the five items are in-page anchors, and an
 * anchor nav that scrolls out of reach on the way to the thing it links to is
 * the one version that is definitely wrong. The drawn appearance at the top of
 * the page is unchanged.
 *
 * The frame paints the link labels #5C5470, which is `--color-violet-text` in
 * the token file. That is a collision, not an intent: violet means XP and level
 * throughout the app (see the token block in globals.css), and these are plain
 * secondary labels. They use `ink-soft`, the token that actually means that —
 * a hair darker, and better contrast. Every other #5C5470 on this page is body
 * copy and resolves the same way.
 */

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#the-zoo", label: "The zoo" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-10 flex-none border-b border-border-track bg-surface">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-site items-center justify-between px-5 py-3 md:px-10 md:py-[18px]"
      >
        <Link href="/" className="flex items-center gap-[11px]">
          <Image
            src="/brand/icon.svg"
            alt=""
            width={38}
            height={38}
            priority
            className="block size-8 flex-none rounded-[11px] md:size-[38px]"
          />
          <span className="font-display text-[19px] font-semibold text-ink md:text-[22px]">
            Task<span className="text-terracotta">Tails</span>
          </span>
        </Link>

        <ul className="flex items-center gap-4 md:gap-[30px]">
          {/* The three in-page anchors drop below `md` rather than folding into
              a hamburger. A menu button is a whole disclosure widget — button,
              expanded state, focus management, Escape — for a page that is one
              short scroll on a phone, where the sections it links to are a
              thumb-flick away. What a narrow screen actually needs from this bar
              is the two things it cannot scroll to: sign in, and sign up. */}
          {LINKS.map((link) => (
            <li key={link.href} className="hidden md:block">
              <a
                href={link.href}
                className="text-[14px] font-bold text-ink-soft hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/login"
              className="text-[13px] font-bold text-terracotta md:text-[14px]"
            >
              Log in
            </Link>
          </li>
          <li>
            <Link
              href="/register"
              className={buttonClasses({
                size: "inline",
                fullWidth: false,
                className: "max-md:h-10 max-md:px-3 max-md:text-[13px]",
              })}
            >
              Get started free
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

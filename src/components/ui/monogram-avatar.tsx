import Image from "next/image";

import { cn } from "@/lib/cn";

/**
 * A participant's face on the leaderboard (LEAD-07).
 *
 * Shows the uploaded avatar (PRO-02/03) when there is one and initials when
 * there isn't — which on this screen is most rows, since the leaderboard is the
 * only place you see accounts other than your own and almost nobody uploads a
 * photo. The addendum draws it three sizes and three colourways: 48px for the
 * podium winner, 40px for 2nd/3rd, 30px in the ranked list.
 *
 * `tone` is the podium medal, not the person — the same account is gold on the
 * pedestal and neutral two rows later, so it is a prop rather than anything
 * derived from the user.
 *
 * Always `aria-hidden`: every caller draws the person's name directly beside
 * this, so announcing initials or "avatar" as well would read the same row
 * twice. The row's accessible name comes from that text, not from here.
 */

/** Podium medal colourways, plus the neutral one the ranked rows use. */
const TONES = {
  gold: "bg-amber-tint border-amber text-amber-text",
  silver: "bg-podium-silver-tint border-podium-silver-ring text-podium-silver-text",
  bronze: "bg-podium-bronze-tint border-podium-bronze-ring text-podium-bronze-text",
  neutral: "bg-warm border-border-track text-ink-soft",
  /** The pinned "You" row — terracotta, never urgency. See globals.css. */
  you: "bg-terracotta-tint border-terracotta text-terracotta-press",
} as const;

export type MonogramTone = keyof typeof TONES;

/**
 * First letters of the first two words, so "Kai" → "K" and "test user 4" → "TU".
 *
 * Falls back to a dash rather than an empty circle for a name that is entirely
 * punctuation or whitespace — nothing enforces a non-empty handle upstream, and
 * a blank ring reads as a broken image.
 */
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("");

  return letters ? letters.toUpperCase() : "–";
}

export function MonogramAvatar({
  name,
  avatarUrl,
  size,
  tone = "neutral",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  /** Diameter in px — 48 (winner), 40 (2nd/3rd) and 30 (list rows) are drawn. */
  size: number;
  tone?: MonogramTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        // The winner's ring is drawn at 2.5px and the smaller ones at 2px; both
        // are fractions Tailwind has no step for, and they scale with the
        // circle rather than being independent choices.
        borderWidth: size >= 48 ? 2.5 : 2,
        // Tracks the diameter so a 30px circle isn't wearing 48px type.
        fontSize: Math.round(size * 0.34),
      }}
      className={cn(
        "relative inline-flex flex-none items-center justify-center overflow-hidden rounded-full font-extrabold",
        TONES[tone],
        className,
      )}
    >
      {avatarUrl ? (
        // `fill` rather than width/height: the span above is already the exact
        // circle, and PRO-03 stores these as base64 data URLs of unknown
        // dimensions, so there is no intrinsic size to hand next/image.
        <Image
          src={avatarUrl}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
          // Data URLs can't be optimised by the image pipeline, and running
          // them through it costs a round trip per row for no gain.
          unoptimized
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

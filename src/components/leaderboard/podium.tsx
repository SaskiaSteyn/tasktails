import { Star } from "lucide-react";

import type { LeaderboardEntry } from "@/lib/leaderboard";
import { cn } from "@/lib/cn";
import { MonogramAvatar, type MonogramTone } from "@/components/ui/monogram-avatar";

/**
 * The top three (LEAD-11), drawn 2 / 1 / 3 left to right with the winner raised.
 *
 * The pedestals carry the ranking as much as the numerals do — 52 / 38 / 30px
 * tall, bottom-aligned — so the shape of the row says who won before any text
 * is read.
 *
 * **DOM order is 1, 2, 3; only the visual order is 2, 1, 3**, via flex `order`.
 * These three people appear nowhere else on the screen — the ranked list below
 * starts at 4 — so hiding the podium from assistive tech would drop the actual
 * winners, and reordering the markup instead would announce second place first.
 * This is the case flex `order` exists for.
 *
 * Fewer than three ranked people is normal early in a study (LEAD-14), so each
 * place renders only if someone holds it. With one participant this is a single
 * gold pedestal, which is correct rather than broken.
 *
 * ## Scaled up from the addendum, on request (2026-08-10)
 *
 * The addendum's figures — 48/40px avatars on 52/38/30px pedestals — are drawn
 * for a 300×640 frame where the vertical budget is genuinely tight. On a real
 * handset (390×844 and up) that leaves the podium looking squished against a
 * large empty area below the ranked rows, so everything here is one scale
 * factor larger. The *proportions* are the addendum's: the pedestal ramp is
 * still ~1 : 0.72 : 0.55, and the winner's avatar is still ~1.24× the others.
 *
 * Sizes live in `SCALE` below rather than being sprinkled through the markup,
 * so the whole podium can be retuned by one number if the frame changes.
 */

/**
 * Multiplier on the addendum's drawn sizes. 1 reproduces the handoff exactly.
 * Everything below is derived from it, so the ramp can't drift out of step.
 *
 * 1.55 is the ceiling, not a preference: the three places plus their gaps have
 * to fit the narrowest screen the app is built for. Below `frame:` (480px) the
 * shell is edge to edge, so the floor is a 320px handset — 288px once `px-4` is
 * taken off. At this scale the places settle at 85px there, still wider than
 * the 74px winner's avatar they have to hold. Raising it overflows that phone
 * even though it looks fine at 390px.
 */
const SCALE = 1.55;

const px = (drawn: number) => Math.round(drawn * SCALE);

type Place = {
  entry: LeaderboardEntry;
  tone: MonogramTone;
  avatar: number;
  pedestal: string;
  text: string;
  height: number;
  /** Where it sits left-to-right. DOM stays in rank order — see above. */
  order: string;
};

function PodiumPlace({ place }: { place: Place }) {
  const { entry, tone, avatar, pedestal, text, height, order } = place;

  return (
    <li
      // Shares the row rather than taking a fixed width, capped at the drawn
      // proportion — so it holds its shape on a 400px frame and shrinks to fit
      // a 320px handset instead of pushing the podium off the side.
      style={{ maxWidth: px(56) }}
      className={cn("flex min-w-0 flex-1 flex-col items-center", order)}
    >
      {/* The winner's star. Takes no space when absent, so 2nd and 3rd still
          align on their own avatars. */}
      {entry.rank === 1 ? (
        <Star
          size={px(18)}
          className="mb-[4px] fill-amber text-amber"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}

      <MonogramAvatar
        name={entry.name}
        avatarUrl={entry.avatarUrl}
        size={avatar}
        tone={tone}
      />

      <p
        className={cn(
          "mt-[7px] w-full truncate text-center text-[11.5px] leading-[1.2] font-extrabold",
          entry.isYou ? "text-terracotta-press" : "text-ink",
        )}
      >
        {entry.name}
        {entry.isYou ? <span className="sr-only"> (you)</span> : null}
      </p>

      <div
        style={{ height }}
        className={cn(
          "mt-[7px] flex w-full flex-col items-center justify-center rounded-t-[12px]",
          pedestal,
        )}
      >
        <span
          className={cn("font-display text-[26px] leading-none font-semibold", text)}
        >
          {/* The numeral is the visual rank; the row states it in words for
              anyone who can't see the pedestal it sits on. */}
          <span aria-hidden>{entry.rank}</span>
          <span className="sr-only">Rank {entry.rank}</span>
        </span>
        <span className={cn("mt-[4px] text-[11px] leading-none font-extrabold", text)}>
          {entry.score.toLocaleString()}
          <span className="sr-only"> coins earned</span>
        </span>
      </div>
    </li>
  );
}

export function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const [first, second, third] = entries;

  // Built in rank order deliberately — `order` below does the 2/1/3 shuffle.
  const places: (Place | undefined)[] = [
    first && {
      entry: first,
      tone: "gold",
      avatar: px(48),
      pedestal: "bg-amber-ring",
      text: "text-amber-text",
      height: px(52),
      order: "order-2",
    },
    second && {
      entry: second,
      tone: "silver",
      avatar: px(40),
      pedestal: "bg-podium-silver",
      text: "text-podium-silver-text",
      height: px(38),
      order: "order-1",
    },
    third && {
      entry: third,
      tone: "bronze",
      avatar: px(40),
      pedestal: "bg-podium-bronze",
      text: "text-podium-bronze-text",
      height: px(30),
      order: "order-3",
    },
  ];

  return (
    <ol
      style={{ gap: px(10) }}
      className="flex flex-none items-end justify-center px-4 pt-[22px] pb-[14px]"
    >
      {places.map((place) =>
        place ? <PodiumPlace key={place.entry.userId} place={place} /> : null,
      )}
    </ol>
  );
}

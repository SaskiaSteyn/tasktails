import type { LeaderboardEntry } from "@/lib/leaderboard";
import { cn } from "@/lib/cn";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";

/**
 * Every rank below the podium (LEAD-12), with your own row always in view
 * (LEAD-13).
 *
 * ## This departs from the addendum, deliberately
 *
 * The handoff draws ranks 4-5, a centered "···", then a pinned copy of your
 * row. That was built first and looked wrong on a real handset: two rows in a
 * screen with space for eight, most of the list unreachable, and the ellipsis
 * standing in for ranks nobody could ever see.
 *
 * Instead the list holds **every** rank and scrolls, and your row is
 * `position: sticky` against the bottom of the scroll container. While you are
 * further down than the fold, it sits against the bottom edge; scroll to it and
 * it settles into its natural place in the order. One row, never duplicated.
 *
 * That replaces three separate mechanisms with one:
 *
 *  - **No fixed visible count.** The list fills whatever height it is given, so
 *    a 640px frame and an 844px handset both use their whole screen. Nothing
 *    measures anything.
 *  - **No ellipsis.** It existed to explain a gap between rank 5 and your row.
 *    Once every rank is present and reachable there is no gap to explain.
 *  - **No expand/collapse state.** The full board is already there, so there is
 *    nothing to expand into — which also keeps this a server component.
 *
 * Sticky positioning needs the scroll container to be the offset parent, which
 * is why `overflow-y-auto` sits on the `<ol>` itself rather than on the wrapper.
 */

function Row({ entry }: { entry: LeaderboardEntry }) {
  const you = entry.isYou;

  return (
    <li
      className={cn(
        "flex flex-none items-center gap-[11px] rounded-[12px] px-3 py-2",
        you
          ? // Terracotta, not urgency — see the note in globals.css. Group A
            // participants must never be shown the Group B accent.
            //
            // `sticky bottom-0` is what keeps you on screen from anywhere in the
            // list. The shadow lifts it off the rows passing underneath, and it
            // needs an opaque fill for the same reason — `terracotta-tint` is.
            "sticky bottom-0 z-10 border-[1.5px] border-terracotta bg-terracotta-tint shadow-nav-idle"
          : "border border-border-track bg-surface",
      )}
    >
      <span
        className={cn(
          "w-5 flex-none font-display text-[14px] font-semibold",
          you ? "text-terracotta-press" : "text-ink-soft",
        )}
      >
        <span aria-hidden>{entry.rank}</span>
        <span className="sr-only">Rank {entry.rank}</span>
      </span>

      <MonogramAvatar
        name={entry.name}
        avatarUrl={entry.avatarUrl}
        size={30}
        tone={you ? "you" : "neutral"}
      />

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[12.5px] font-extrabold",
          you ? "text-terracotta-press" : "text-ink",
        )}
      >
        {entry.name}
        {you ? <span className="sr-only"> (you)</span> : null}
      </span>

      <span
        className={cn(
          "flex-none text-[12px] font-extrabold",
          you ? "text-terracotta-press" : "text-ink-soft",
        )}
      >
        {entry.score.toLocaleString()}
        <span className="sr-only"> coins earned</span>
      </span>
    </li>
  );
}

export function RankedList({ entries }: { entries: LeaderboardEntry[] }) {
  // The podium already drew the top three.
  const below = entries.slice(3);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-list-well px-[14px] pt-1 pb-2">
      <ol className="flex min-h-0 flex-1 flex-col gap-[5px] overflow-y-auto">
        {below.map((entry) => (
          <Row key={entry.userId} entry={entry} />
        ))}
      </ol>
    </div>
  );
}

import { lifetimeEarningsFor } from "@/lib/economy";
import { listParticipants, type ParticipantSummary } from "@/lib/users";

/**
 * LEAD-03 — the all-time leaderboard (`design_handoff/ADDENDUM-leaderboard.md`).
 *
 * Composes `users.ts`'s `listParticipants()` and `economy.ts`'s
 * `lifetimeEarningsFor()` rather than querying Prisma itself — both of those
 * modules already own exclusive access to their table, and this has nothing new
 * to add to either. Same shape as `stats.ts`.
 *
 * SERVER ONLY — reaches Prisma through those two modules.
 *
 * ## The metric is coins *earned*
 *
 * `UserEconomy.lifetimeCoinsEarned`, which has exactly one writer in the
 * codebase: the `grantEarnings()` increment in `economy.ts`. Three consequences
 * worth stating, because they are the reason it was chosen over XP:
 *
 *  - **Spending cannot lower a rank.** `coins` (the wallet) falls on every
 *    purchase; this column never does. The study measures store purchasing
 *    under false urgency, so a board that charged participants rank for buying
 *    would push against its own dependent variable.
 *  - **Selling cannot raise one.** `sell.ts` refunds into `coins` only. The
 *    buy → pull → sell loop moves the wallet and leaves the score untouched.
 *    On an XP board it would not: the refund converts through `buyXp()` at
 *    100 coins → 40 XP, and Lucky Box churn would buy position.
 *  - **It is the number already on the Profile screen** — the LIFETIME grid's
 *    "coins earned" tile (PRO-04) is this same column, and the rank button
 *    (LEAD-08) sits directly beneath it.
 *
 * To rank on something else, change `lifetimeEarningsFor` for another read
 * returning the same `Map<userId, score>`; nothing below knows what the number
 * means.
 *
 * ## Only all time, for now
 *
 * The addendum's "This week" / "This month" tabs are not implementable yet:
 * nothing records *when* coins were earned (`lifetimeCoinsEarned` only grows,
 * `dailyCoinsEarned` resets daily, `Transaction` records coins *spent*), which
 * is what LEAD-01/02's ledger is for. Period selection is deliberately absent
 * from this module's signature rather than stubbed — when the ledger lands,
 * `allTimeLeaderboard()` becomes one case of a period-taking read and
 * `rankParticipants()` below is unaffected.
 */

/** One ranked row. `score` is the metric documented above. */
export type LeaderboardEntry = {
  userId: string;
  /** What every participant sees for this row — never an email. See `nameFor`. */
  name: string;
  /** PRO-02/03's uploaded photo — null for the (majority) of accounts without
   * one, which `MonogramAvatar` already renders as initials instead. Unlike
   * `email`, showing this to other participants is opt-in: nobody has one
   * unless they chose to upload it. */
  avatarUrl: string | null;
  score: number;
  /** 1-based, competition-ranked: equal scores share a rank and the next skips. */
  rank: number;
  isYou: boolean;
};

export type Leaderboard = {
  /** Every participant, best first. The screen decides how many to draw. */
  entries: LeaderboardEntry[];
  /**
   * The caller's own row, or null when the caller isn't a participant — which
   * in practice means the researcher's ADMIN account, excluded below.
   */
  you: LeaderboardEntry | null;
  /** How many people are ranked at all, for "Top 8%" and the sparse states. */
  participantCount: number;
};

/**
 * What a participant is called *to other participants*.
 *
 * Not `users.ts`'s `displayNameFor()`, which falls back to the email's local
 * part when someone has no handle. That fallback is correct where it is used —
 * greeting you by name on your own screens — but this list is the one place in
 * the app where accounts are shown to *each other*, and "saskia" from
 * `saskia@…` is a slice of an email address disclosed to every other
 * participant. Anyone who skipped the AUTH-07 username step gets a positional
 * label instead, the same "Participant 7" convention the admin tables use.
 *
 * Your own row is exempt: `allTimeLeaderboard()` overrides it with the name you
 * already see on your own Profile.
 */
export function nameFor(
  participant: Pick<ParticipantSummary, "username">,
  /** 1-based position in account-creation order — stable across reads. */
  ordinal: number,
): string {
  return participant.username ?? `Participant ${ordinal}`;
}

/**
 * Sorts and ranks. Pure — no Prisma, no session — so the tie and ordering rules
 * can be tested directly.
 *
 * **Competition ranking** (1, 2, 2, 4), not a positional index. Early in a
 * deployment most participants are tied on 0, and telling two people with
 * identical scores that one of them is ahead would be an artefact of row order
 * rather than anything they did.
 *
 * Ties are then broken by account age for *display* order only, which
 * `listParticipants()` already provides (it orders by `createdAt`) and a stable
 * sort preserves. Two tied rows therefore always appear in the same order
 * between reads, while still showing the same rank number.
 */
export function rankParticipants(
  rows: { userId: string; name: string; avatarUrl: string | null; score: number }[],
  youId: string | null,
): LeaderboardEntry[] {
  // Sort is stable in every runtime this targets (ES2019+), so equal scores keep
  // the caller's incoming order — see the tie note above.
  const sorted = [...rows].sort((a, b) => b.score - a.score);

  let lastScore: number | null = null;
  let lastRank = 0;

  return sorted.map((row, index) => {
    // Equal scores share the earlier row's rank; a different score takes this
    // row's 1-based position, which is what makes the sequence skip after a tie.
    const rank = row.score === lastScore ? lastRank : index + 1;
    lastScore = row.score;
    lastRank = rank;

    return {
      userId: row.userId,
      name: row.name,
      avatarUrl: row.avatarUrl,
      score: row.score,
      rank,
      isYou: row.userId === youId,
    };
  });
}

/**
 * The whole board, ranked, plus the caller's own row.
 *
 * Admins are excluded because `listParticipants()` excludes them — the
 * researcher account is not a competitor, and it would otherwise sit in the
 * ranking with whatever coins the researcher earned while testing.
 *
 * A participant with no `UserEconomy` row scores 0 rather than being dropped:
 * every account gets one at creation (AUTH-04), so a missing row means a
 * half-deleted account, and silently shortening the board is a worse failure
 * than showing it on zero.
 */
export async function allTimeLeaderboard(
  youId: string | null,
): Promise<Leaderboard> {
  const participants = await listParticipants();
  const earnings = await lifetimeEarningsFor(participants.map((p) => p.id));

  const rows = participants.map((participant, index) => ({
    userId: participant.id,
    name: nameFor(participant, index + 1),
    avatarUrl: participant.avatarUrl,
    score: earnings.get(participant.id) ?? 0,
  }));

  const entries = rankParticipants(rows, youId);

  return {
    entries,
    you: entries.find((entry) => entry.isYou) ?? null,
    participantCount: entries.length,
  };
}

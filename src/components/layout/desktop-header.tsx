import { auth } from "@/auth";
import { PageTitle } from "@/components/layout/page-title";
import { CoinPill } from "@/components/ui/coin";
import { RankBadge } from "@/components/ui/rank-badge";
import { StreakPill } from "@/components/ui/streak";
import { currentEconomy } from "@/lib/economy";
import { allTimeLeaderboard } from "@/lib/leaderboard";

/**
 * The universal desktop header (INF-22) — 76px, page name on the left, three
 * status chips on the right in the handoff's order: streak, coins, and (since
 * 2026-09-05, the user's request) rank in place of the level disc. Rank is the
 * one chip that is not read-only: it links to the leaderboard, the same way
 * the phone header's own badge does. Deliberately nothing else. Page-specific controls (the store's
 * search, the cart's checkout, a back link) stay in the page body or the
 * relevant panel, which is what keeps this bar identical on every screen.
 *
 * The chips are the shipped `StreakPill`/`CoinPill`/`RankBadge` rather than
 * the mock's redrawn white pills — the handoff's rule 1. Same server-side
 * `currentEconomy()` read `PersistentHeader` does, and for the same reason:
 * the balance must be right on first paint, never counted up from zero.
 *
 * 66px and a smaller rank disc below `xl`, per the handoff's 900px pair.
 */
export async function DesktopHeader() {
  const session = await auth();
  const [economy, board] = await Promise.all([
    currentEconomy(),
    allTimeLeaderboard(session?.user?.id ?? null),
  ]);
  if (!economy) return null;

  return (
    <header className="flex h-[66px] flex-none items-center gap-4 border-b border-border-track bg-warm px-5 xl:h-[76px] xl:px-8">
      <PageTitle />
      <div className="ml-auto flex flex-none items-center gap-[10px]">
        <StreakPill days={economy.streak} />
        <CoinPill coins={economy.coins} />
        {board.you ? (
          <RankBadge rank={board.you.rank} className="xl:size-[38px] xl:text-[14px]" />
        ) : null}
      </div>
    </header>
  );
}

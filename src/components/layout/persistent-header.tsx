import type { ReactNode } from "react";

import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/app-header";
import { currentEconomy } from "@/lib/economy";
import { allTimeLeaderboard } from "@/lib/leaderboard";
import { displayNameFor, findUserByEmail } from "@/lib/users";

/**
 * The persistent header, wired to the database (INF-12).
 *
 * A server component so coins, rank and streak are rendered from the row rather
 * than fetched by the browser — the balance is correct on first paint, and a
 * participant never sees it count up from zero.
 *
 * Renders nothing when signed out. The header only appears on protected screens,
 * so that state should be unreachable; failing quiet beats throwing on a screen
 * the proxy is already redirecting away from.
 *
 * Note this deliberately carries no study-group signal of any kind — see the
 * note at the top of src/auth.ts.
 */
export async function PersistentHeader({
  title,
  action,
  showProgress,
}: {
  title?: string;
  action?: ReactNode;
  showProgress?: boolean;
}) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  // The rank is only drawn by the greeting variant (`AppHeader`), so a titled
  // screen doesn't pay for the board read.
  const [record, economy, board] = await Promise.all([
    findUserByEmail(email),
    currentEconomy(),
    title ? null : allTimeLeaderboard(session.user?.id ?? null),
  ]);
  if (!economy) return null;

  return (
    <AppHeader
      title={title}
      name={record ? displayNameFor(record) : undefined}
      economy={economy}
      rank={board?.you?.rank}
      showProgress={showProgress}
      action={action}
    />
  );
}

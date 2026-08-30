import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/logout-button";
import { RailNav } from "@/components/layout/rail-nav";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { openTaskCount } from "@/lib/tasks";
import { displayNameFor, findUserByEmail } from "@/lib/users";

/**
 * The persistent left rail (INF-22) — the desktop half of the nav model whose
 * other half is SHR-01's floating bottom nav. Both draw `NAV_ITEMS`.
 *
 * A server component so the open-task count is correct on first paint rather
 * than appearing a moment later, the same reasoning `PersistentHeader` gives
 * for the coin balance.
 *
 * The handoff also draws an amber "a pet needs care" dot on the Petting zoo
 * row. Removed on the user's direction (2026-08-30) — with it went the
 * `petsForUser()` read that backed it, so the rail no longer queries the pet
 * table on every page in the group.
 *
 * Renders nothing when signed out: the rail is only mounted by the `(app)`
 * route group, every page of which redirects an anonymous visitor, so that
 * state should be unreachable — failing quiet beats throwing on a screen the
 * proxy is already redirecting away from.
 *
 * "Log out" is the last row of the nav list per the handoff, but drawn as the
 * implemented `LogoutButton` rather than as the mock's plain danger-coloured
 * row: the handoff's own rule 1 is that a shipped component wins over the
 * mock's rendering of it, and this one carries AUTH-03's confirm modal and its
 * server action. It is hidden on the collapsed icon rail, where a full-width
 * outlined button has nowhere to go — Settings still carries the same button
 * one click away, so nothing becomes unreachable.
 */
export async function AppRail() {
  const session = await auth();
  const email = session?.user?.email;
  const userId = session?.user?.id;
  if (!email || !userId) return null;

  const [record, openTasks] = await Promise.all([
    findUserByEmail(email),
    openTaskCount(userId),
  ]);
  if (!record) return null;

  const name = displayNameFor(record);

  return (
    <aside className="hidden flex-none flex-col items-center gap-4 border-r border-border-track bg-warm px-0 py-[18px] desk:flex desk:w-[76px] xl:w-[248px] xl:items-stretch xl:gap-6 xl:px-4 xl:pt-6 xl:pb-5">
      <Link href="/tasks" className="flex items-center gap-[10px] xl:ml-[6px]">
        <Image
          src="/brand/icon.svg"
          alt=""
          width={34}
          height={34}
          priority
          className="block size-[34px] flex-none rounded-[11px] xl:size-[27px]"
        />
        <span className="hidden font-display text-[19px] leading-none font-semibold text-ink xl:block">
          Task<span className="text-terracotta">Tails</span>
        </span>
        <span className="sr-only xl:hidden">TaskTails</span>
      </Link>

      <RailNav openTasks={openTasks} />

      <LogoutButton className="hidden xl:block" />

      <div className="mt-auto flex items-center gap-[10px] xl:px-[6px] xl:py-2">
        <MonogramAvatar name={name} avatarUrl={record.avatarUrl} size={36} />
        <div className="hidden min-w-0 flex-col leading-[1.25] xl:flex">
          <span className="truncate text-[13.5px] font-extrabold">{name}</span>
          <span className="truncate text-[11.5px] font-semibold text-ink-soft">
            {record.email}
          </span>
        </div>
      </div>
    </aside>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ZooGrid } from "@/components/pets/zoo-grid";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { redirectAdminsAway } from "@/lib/admin";
import {
  equippedAccessoriesForUser,
  equippedBackgroundsForUser,
} from "@/lib/inventory";
import { petsForUser } from "@/lib/pets";

export const metadata: Metadata = {
  title: "Your zoo · TaskTails",
};

/**
 * PET-01 — the zoo gallery, per `design_handoff/ADDENDUM-zoo-gallery.md`:
 * `Zoo nav button → Zoo gallery → (tap a pet) → Sanctuary`. Replaces the
 * single-page stack of full Sanctuary stages this route used to render —
 * that filled the addendum's "displays all of the user's owned animals"
 * wording differently, before the addendum specified an actual gallery +
 * drill-in flow. The drill-in screen is `/zoo/[id]` (PET-01 as well, since
 * there's no separate ticket for it — the addendum is one flow, not two
 * tickets' worth of scope).
 *
 * Bespoke header, not `PersistentHeader`: the addendum's gallery header has
 * no coin pill at all, which `AppHeader`'s title variant has no way to omit
 * (every other titled screen in the app keeps it). Same call the addendum
 * makes again for the Sanctuary screen's own header.
 *
 * Reads `petsForUser()` directly, same server-component pattern `TasksPage`
 * uses for `tasksForUser()` — no API route needed since nothing but this
 * page (and `/zoo/[id]`) renders it (PET-06 is the network-facing version).
 */
export default async function ZooPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  await redirectAdminsAway(userId);

  const [pets, backgrounds, accessories] = await Promise.all([
    petsForUser(userId),
    equippedBackgroundsForUser(userId),
    equippedAccessoriesForUser(userId),
  ]);

  return (
    <AppShell
      header={
        <header className="flex-none border-b border-border-track px-[18px] pt-[14px] pb-3">
          <h1 className="font-display text-[19px] leading-[1.15] font-semibold">
            Your zoo
          </h1>
          <p className="mt-[2px] text-[11px] text-ink-faint">
            {pets.length} {pets.length === 1 ? "friend" : "friends"} · tap to visit
          </p>
        </header>
      }
      nav={<BottomNav />}
      className="p-[14px] desk:px-[34px] desk:py-7"
    >
      <SessionTracker />
      {/* The count line from the phone header, which `AppShell` hides at
          desktop widths — the universal header carries the title only. */}
      <p className="mb-4 hidden text-[12.5px] font-bold text-ink-soft desk:block">
        {pets.length} {pets.length === 1 ? "friend" : "friends"} · click to visit
      </p>
      <ZooGrid
        pets={pets}
        backgrounds={backgrounds}
        accessories={accessories}
        // The handoff's gallery is 3-up on a full desktop; the phone frame's
        // 2-up is kept below that.
        className="desk:gap-[22px] xl:grid-cols-3"
      />
    </AppShell>
  );
}

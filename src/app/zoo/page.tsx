import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ZooGalleryCard } from "@/components/pets/zoo-gallery-card";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { redirectAdminsAway } from "@/lib/admin";
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

  const pets = await petsForUser(userId);

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
      className="p-[14px]"
    >
      <SessionTracker />
      {/* Grid always renders, even at zero pets — the addendum's own
          behaviour note: "Empty state (no pets) should surface the adopt
          slot prominently," not a separate empty-state screen replacing the
          grid entirely. */}
      <div className="grid grid-cols-2 gap-3">
        {pets.map((pet) => (
          <ZooGalleryCard key={pet.id} pet={pet} />
        ))}
        <Link
          href="/store"
          className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-card-lg border-2 border-dashed border-checkbox text-ink-faint transition-colors duration-120 hover:border-ink-disabled hover:text-ink-soft"
        >
          <span className="flex size-9 items-center justify-center rounded-full border-2 border-checkbox">
            <Plus size={18} strokeWidth={2.4} aria-hidden />
          </span>
          <span className="text-[12px] font-bold">Adopt another</span>
        </Link>
      </div>
    </AppShell>
  );
}

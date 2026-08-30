import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AnimalCard } from "@/components/pets/animal-card";
import { ZooGrid } from "@/components/pets/zoo-grid";
import {
  equippedAccessoriesForUser,
  equippedAccessoryForPet,
  equippedBackgroundForPet,
  equippedBackgroundsForUser,
  foodInventoryForUser,
} from "@/lib/inventory";
import { petDisplayName } from "@/lib/pet-mood";
import { petForUser, petsForUser } from "@/lib/pets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { title: "Sanctuary · TaskTails" };

  const { id } = await params;
  const pet = await petForUser(userId, id);
  return { title: pet ? `${petDisplayName(pet)} · TaskTails` : "Sanctuary · TaskTails" };
}

/**
 * PET-01's drill-in — the Sanctuary stage for one animal, reached by tapping
 * a card in the zoo gallery (`/zoo`). Same "scope the lookup, redirect if
 * it's not there or not yours" pattern `EditTaskPage` uses for
 * `taskForUser()` — a pet id that belongs to someone else reads identically
 * to one that doesn't exist, back to the gallery either way.
 *
 * The header is `ADDENDUM-zoo-gallery.md`'s "Sanctuary header change": the
 * pet's own name instead of the word "Sanctuary", no coin pill, no
 * background fill (just the shared border-bottom), and a back chevron —
 * built the same way `EditTaskPage`'s back-to-list header is, since neither
 * is `PersistentHeader`'s title variant, which always carries a coin pill.
 * Unlike that screen, this one keeps `BottomNav`: the pre-addendum Sanctuary
 * mock already drew it there, and this is a tab's content, not a focused
 * edit flow.
 */
export default async function SanctuaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const { id } = await params;
  const [pet, foodItems, backgroundUrl, accessoryUrl, pets, backgrounds, accessories] =
    await Promise.all([
      petForUser(userId, id),
      foodInventoryForUser(userId),
      equippedBackgroundForPet(userId, id),
      equippedAccessoryForPet(userId, id),
      petsForUser(userId),
      equippedBackgroundsForUser(userId),
      equippedAccessoriesForUser(userId),
    ]);
  if (!pet) redirect("/zoo");

  // INF-22 — the handoff's roster beside the stage. Everyone but the animal
  // already filling the left pane.
  const others = pets.filter((other) => other.id !== pet.id);

  return (
    <AppShell
      header={
        <header
          // 8px top / 18px sides / 14px bottom, safe-area-aware — see the
          // note on this same header shape in settings/page.tsx.
          className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] py-[14px]"
        >
          <Link
            href="/zoo"
            aria-label="Back to your zoo"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="min-w-0 truncate font-display text-[19px] leading-[1.15] font-semibold">
            {petDisplayName(pet)}
          </h1>
        </header>
      }
      nav={<BottomNav />}
      className="gap-3 px-4 pt-4 pb-4 desk:flex-row desk:gap-[26px] desk:px-8 desk:py-[26px]"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AnimalCard
          pet={pet}
          foodItems={foodItems}
          backgroundUrl={backgroundUrl}
          accessoryUrl={accessoryUrl}
        />
      </div>

      {/* The care controls stay inside `AnimalCard` where they are already
          built and tested — the handoff draws them in this panel, but its own
          rule 1 puts the shipped component ahead of the mock's rendering of
          it. What the panel adds is the part the phone frame has nowhere to
          put: the rest of the zoo, one click away from the stage. */}
      <aside className="hidden flex-none flex-col gap-4 overflow-y-auto desk:flex desk:w-[420px]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[15.5px] font-semibold">Your other friends</h2>
          <Link
            href="/zoo"
            className="text-[12px] font-bold text-terracotta hover:text-terracotta-hover"
          >
            See all
          </Link>
        </div>
        <ZooGrid pets={others} backgrounds={backgrounds} accessories={accessories} />
      </aside>
    </AppShell>
  );
}

import { Plus } from "lucide-react";
import Link from "next/link";

import { ZooGalleryCard } from "@/components/pets/zoo-gallery-card";
import { cn } from "@/lib/cn";
import type { PetWithItem } from "@/lib/pets";

/**
 * PET-01's gallery grid — the owned animals plus the "Adopt another" slot.
 *
 * Extracted from `/zoo` when INF-22's desktop Tasks screen grew an activity
 * panel drawing the same grid at a different column count: one copy, two
 * placements, rather than the gallery's markup living in a page that another
 * page then has to imitate.
 *
 * The grid always renders, even at zero pets — the zoo addendum's own
 * behaviour note ("Empty state (no pets) should surface the adopt slot
 * prominently"), not a separate empty-state screen replacing it.
 */
export function ZooGrid({
  pets,
  backgrounds,
  accessories,
  className,
}: {
  pets: PetWithItem[];
  backgrounds: Record<string, string | undefined>;
  accessories: Record<string, string | undefined>;
  /** Column count and gap — the caller owns those, they differ per placement. */
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {pets.map((pet) => (
        <ZooGalleryCard
          key={pet.id}
          pet={pet}
          backgroundUrl={backgrounds[pet.id]}
          accessoryUrl={accessories[pet.id]}
        />
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
  );
}

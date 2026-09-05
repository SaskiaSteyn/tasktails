import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PetCustomizer } from "@/components/pets/pet-customizer";
import { accessoryInventoryForUser, decorationInventoryForUser } from "@/lib/inventory";
import { petDisplayName } from "@/lib/pet-mood";
import { petForUser, petsForUser } from "@/lib/pets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { title: "Customize · TaskTails" };

  const { id } = await params;
  const pet = await petForUser(userId, id);
  return { title: pet ? `Customize ${petDisplayName(pet)} · TaskTails` : "Customize · TaskTails" };
}

/**
 * The full-page customize screen — a drill-in from the Sanctuary
 * (`/zoo/[id]`) rather than the bottom sheet PET-05 originally shipped
 * (`CustomizeSheet`, since removed). Same "scope the lookup, redirect if
 * it's not there or not yours" pattern `SanctuaryPage` and `EditTaskPage`
 * use for their own owner-scoped lookups.
 */
export default async function CustomizePetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const { id } = await params;
  const [pet, accessories, decorations, pets] = await Promise.all([
    petForUser(userId, id),
    accessoryInventoryForUser(userId),
    decorationInventoryForUser(userId),
    petsForUser(userId),
  ]);
  if (!pet) redirect("/zoo");

  // #215 — one pet at a time. Any equippable copy already on a *different*
  // pet is locked in the grid, captioned with that pet's name; the customize
  // route enforces the same rule server-side. Keyed by inventory-item id so
  // `PetCustomizer` can look each tile up directly.
  const petNameById = new Map(pets.map((p) => [p.id, petDisplayName(p)]));
  const lockedByPet: Record<string, string> = {};
  for (const item of [...accessories, ...decorations]) {
    if (item.equippedToPetId && item.equippedToPetId !== pet.id) {
      lockedByPet[item.id] = petNameById.get(item.equippedToPetId) ?? "another pet";
    }
  }

  return (
    <PetCustomizer
      pet={pet}
      accessories={accessories}
      decorations={decorations}
      lockedByPet={lockedByPet}
    />
  );
}

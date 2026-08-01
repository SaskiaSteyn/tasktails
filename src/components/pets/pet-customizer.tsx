"use client";

import { Check, ChevronLeft, Pencil } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
// Type-only: erased at compile time, same reasoning `AnimalCard` documents
// for `PetWithItem`/`InventoryItemWithStoreItem` — this stays a client
// component without pulling `src/lib/pets.ts`/`src/lib/inventory.ts`'s
// Prisma imports into the browser bundle.
import type { InventoryItemWithStoreItem } from "@/lib/inventory";
import { petDisplayName } from "@/lib/pet-mood";
import type { PetWithItem } from "@/lib/pets";

/**
 * The full-page customize screen, replacing PET-05's original bottom sheet
 * (`CustomizeSheet`, since removed) at the user's request: a dedicated
 * screen with the pet fixed at the top and its owned accessories scrollable
 * underneath, rather than a modal that closed after one pick. Matches the
 * design handoff's "Customize Mochi" frame (`TaskTails Screens.dc.html`,
 * Petting Zoo group) — pet stage panel up top, "YOUR ACCESSORIES" grid below
 * — filtered to owned items only, per this ticket's own scope (the mock's
 * dashed locked/gated tiles and "OTHER ANIMALS" row are a different concern
 * this rework doesn't touch).
 *
 * Tapping an owned accessory equips it immediately — no separate "Equip"
 * button, unlike the old sheet — so the pet visibly "wears" it as its own
 * preview. Since accessory art is an icon name rather than a positioned
 * overlay image (`imageUrl` is a `lucide-react/dynamic` icon name, same cast
 * `CustomizeSheet` used), the preview is a badge over the pet's own image
 * rather than a literal composited garment — the clearest "here's what's
 * equipped" treatment the real data supports.
 *
 * No `nav` on `AppShell` — a focused drill-in from the Sanctuary screen, same
 * "no bottom nav" call `EditTaskPage` makes for the same reason (this is an
 * edit flow, not tab content).
 */
export function PetCustomizer({
  pet,
  accessories,
}: {
  pet: PetWithItem;
  accessories: InventoryItemWithStoreItem[];
}) {
  const router = useRouter();
  const nameInputId = useId();

  const [name, setName] = useState(() => petDisplayName(pet));
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [nameError, setNameError] = useState<string>();
  const [savingName, setSavingName] = useState(false);

  const [equippedId, setEquippedId] = useState(
    () => accessories.find((item) => item.equippedToPetId === pet.id)?.id,
  );
  const [equipping, setEquipping] = useState(false);
  const [equipError, setEquipError] = useState<string>();

  const equippedItem = accessories.find((item) => item.id === equippedId);

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError("Give your pet a name.");
      return;
    }
    if (trimmed === name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    setNameError(undefined);
    try {
      const response = await fetch(`/api/pets/${pet.id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setNameError(body?.fieldErrors?.name ?? body?.error ?? "Couldn't save that name. Try again.");
        return;
      }
      setName(trimmed);
      setEditingName(false);
      router.refresh();
    } catch {
      setNameError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleEquip(item: InventoryItemWithStoreItem) {
    if (equipping || item.id === equippedId) return;

    const previous = equippedId;
    setEquippedId(item.id);
    setEquipping(true);
    setEquipError(undefined);
    try {
      const response = await fetch(`/api/pets/${pet.id}/customize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: item.id }),
      });
      if (!response.ok) {
        setEquippedId(previous);
        setEquipError(`Couldn't equip ${item.storeItem.name}. Try again.`);
        return;
      }
      router.refresh();
    } catch {
      setEquippedId(previous);
      setEquipError("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setEquipping(false);
    }
  }

  return (
    <AppShell
      header={
        <header className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] pt-[14px] pb-[14px]">
          <Link
            href={`/zoo/${pet.id}`}
            aria-label={`Back to ${name}'s sanctuary`}
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="min-w-0 truncate font-display text-[19px] leading-[1.15] font-semibold">
            Customize {name}
          </h1>
        </header>
      }
      className="gap-4 p-4"
    >
      <div className="flex flex-none flex-col items-center rounded-card-lg bg-linear-to-b from-[#EAF3EC] to-[#F3ECE1] px-4 py-5">
        <div className="relative size-[118px]">
          <Image
            src={pet.storeItem.imageUrl}
            alt={name}
            width={118}
            height={118}
            className="block size-[118px]"
          />
          {equippedItem ? (
            <span
              aria-hidden
              className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-violet-tint text-violet-text ring-2 ring-surface shadow-card"
            >
              <DynamicIcon
                name={equippedItem.storeItem.imageUrl as IconName}
                size={18}
                strokeWidth={2.2}
              />
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex min-h-8 items-center">
          {editingName ? (
            <form onSubmit={handleRename} className="flex items-center gap-1.5">
              <label htmlFor={nameInputId} className="sr-only">
                Pet name
              </label>
              <input
                id={nameInputId}
                value={nameValue}
                onChange={(event) => {
                  setNameValue(event.target.value);
                  setNameError(undefined);
                }}
                maxLength={30}
                autoFocus
                disabled={savingName}
                className="w-32 rounded-input border border-border-input bg-surface px-2.5 py-1.5 text-center font-display text-[16px] font-semibold text-ink"
              />
              <Button type="submit" size="inline" fullWidth={false} disabled={savingName} className="px-3">
                {savingName ? "Saving…" : "Save"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setNameValue(name);
                  setNameError(undefined);
                  setEditingName(false);
                }}
                disabled={savingName}
                className="rounded-chip px-2 py-1 text-[13px] font-bold text-ink-soft transition-colors duration-120 hover:text-ink"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameValue(name);
                setEditingName(true);
              }}
              aria-label={`Rename ${name}`}
              className="group flex items-center gap-1.5"
            >
              <p className="font-display text-[18px] font-semibold">{name}</p>
              <Pencil
                size={14}
                strokeWidth={2.2}
                aria-hidden
                className="text-ink-faint transition-colors duration-120 group-hover:text-ink-soft"
              />
            </button>
          )}
        </div>
        {nameError ? (
          <p role="alert" className="mt-1 text-[11px] font-bold text-urgency-text">
            {nameError}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <p className="text-overline mb-[10px] flex-none text-ink-faint">Your accessories</p>

        {accessories.length === 0 ? (
          <p className="text-[13px] text-ink-soft">
            You don&rsquo;t have any accessories yet. Buy some in the store first.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div role="radiogroup" aria-label="Accessories" className="grid grid-cols-3 gap-[9px] pb-2">
              {accessories.map((item) => {
                const isEquipped = item.id === equippedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isEquipped}
                    disabled={equipping}
                    onClick={() => handleEquip(item)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-[13px] border p-2.5 text-center transition-colors duration-120",
                      isEquipped
                        ? "border-sage bg-sage-tint"
                        : "border-border-track bg-warm hover:border-checkbox",
                      equipping && "cursor-wait",
                    )}
                  >
                    {isEquipped ? (
                      <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-sage text-white">
                        <Check size={10} strokeWidth={3} aria-hidden />
                      </span>
                    ) : null}
                    <span className="flex size-11 items-center justify-center rounded-[10px] bg-violet-tint text-violet-text">
                      <DynamicIcon
                        name={item.storeItem.imageUrl as IconName}
                        size={20}
                        strokeWidth={2.2}
                        aria-hidden
                      />
                    </span>
                    <span className="w-full truncate text-[11px] font-extrabold">
                      {item.storeItem.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {equipError ? (
          <p role="alert" className="mt-2 flex-none text-[11px] font-bold text-urgency-text">
            {equipError}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

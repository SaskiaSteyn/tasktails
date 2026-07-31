"use client";

import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
// Type-only: erased at compile time, same reasoning `AnimalCard` documents for
// `PetWithItem` — this stays a client component without pulling
// `src/lib/inventory.ts`'s Prisma import into the browser bundle.
import type { InventoryItemWithStoreItem } from "@/lib/inventory";

/**
 * PET-05 — the customize sheet. Lists the user's owned accessories
 * (`accessoryInventoryForUser()`, fetched once by `/zoo/[id]` the same way
 * PET-04's food list is) and lets you pick one to equip.
 *
 * Built on the same native-`<dialog>` bottom sheet as `FeedSheet`/
 * `CreateTaskSheet` — platform focus-trap, Escape-to-close, scrim tap,
 * `frame:` centred dialog above 480px.
 *
 * Unlike food, `equippedToPetId` is real, already-queried data, not
 * something this ticket invents — so whichever accessory is currently
 * equipped to *this* pet opens pre-selected, and every row is labelled with
 * its real equip state ("Equipped" / "Equipped elsewhere" / "×N owned")
 * rather than only a quantity. What's stubbed is just the *write*: **no
 * `POST /api/pets/[id]/customize` yet** — PET-09 is a separate, unbuilt
 * ticket, so confirming a selection surfaces a "Not connected yet" notice
 * rather than a fetch, same decision PET-03/04 made ahead of PET-07/08.
 */
export function CustomizeSheet({
  open,
  onOpenChange,
  petId,
  petName,
  accessories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId: string;
  petName: string;
  accessories: InventoryItemWithStoreItem[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  const equippedItem = accessories.find((item) => item.equippedToPetId === petId);

  const [selectedId, setSelectedId] = useState<string | undefined>(equippedItem?.id);
  const [notice, setNotice] = useState<string>();

  // Every open starts from this pet's real equip state, not a blank slate —
  // same "adjust during render" pattern `FeedSheet`/`CreateTaskSheet` use
  // rather than an effect that would fire an extra render for the same
  // result.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setNotice(undefined);
    } else {
      setSelectedId(equippedItem?.id);
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const selected = accessories.find((item) => item.id === selectedId);

  function handleEquip() {
    if (!selected) return;
    setNotice(
      `Not connected yet — equipping ${selected.storeItem.name} on ${petName} needs PET-09.`,
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false);
      }}
      aria-labelledby={headingId}
      className={cn(
        "max-h-[85vh] bg-transparent p-0 text-ink backdrop:bg-scrim",
        "fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-[26px]",
        "frame:inset-0 frame:m-auto frame:h-fit frame:w-[calc(100%-2.5rem)] frame:max-w-app frame:rounded-[26px]",
      )}
    >
      <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-[26px] bg-surface pb-[env(safe-area-inset-bottom)] shadow-modal frame:rounded-[26px]">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="group w-full flex-none py-3"
        >
          <span className="mx-auto block h-[5px] w-10 rounded-[3px] bg-step-idle transition-colors duration-120 group-hover:bg-checkbox" />
        </button>

        <div className="overflow-y-auto px-5 pt-1 pb-5">
          <h2 id={headingId} className="mb-4 font-display text-[20px] font-semibold">
            Customize {petName}
          </h2>

          {accessories.length === 0 ? (
            <p className="mb-4 text-[13px] text-ink-soft">
              You don&rsquo;t have any accessories yet. Buy some in the store first.
            </p>
          ) : (
            <div
              role="radiogroup"
              aria-label="Accessories"
              className="mb-4 flex flex-col gap-[9px]"
            >
              {accessories.map((item) => {
                const isSelected = item.id === selectedId;
                const isEquippedHere = item.equippedToPetId === petId;
                const isEquippedElsewhere =
                  item.equippedToPetId != null && !isEquippedHere;

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setSelectedId(item.id);
                      setNotice(undefined);
                    }}
                    className={cn(
                      "flex items-center gap-[11px] rounded-[14px] border px-[10px] py-[10px] text-left transition-colors duration-120",
                      isSelected
                        ? "border-terracotta bg-terracotta-tint"
                        : "border-border-track bg-warm hover:border-checkbox",
                    )}
                  >
                    <span className="flex size-11 flex-none items-center justify-center rounded-[10px] bg-violet-tint text-violet-text">
                      <DynamicIcon
                        // `imageUrl` is a free-form DB string (SVG paths for
                        // animals, icon names for everything else per
                        // `seed.ts`) — cast rather than widen `IconName`,
                        // since the seed data is the only source of truth for
                        // what's actually in it.
                        name={item.storeItem.imageUrl as IconName}
                        size={20}
                        strokeWidth={2.2}
                        aria-hidden
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-extrabold">
                        {item.storeItem.name}
                      </span>
                      <span
                        className={cn(
                          "text-[11px]",
                          isEquippedHere ? "font-bold text-sage-text" : "text-ink-soft",
                        )}
                      >
                        {isEquippedHere
                          ? "Equipped"
                          : isEquippedElsewhere
                            ? "Equipped elsewhere"
                            : `×${item.quantity} owned`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="full"
              disabled={!selected}
              onClick={handleEquip}
            >
              Equip
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-chip px-3 py-1 text-[13px] font-bold text-ink-soft transition-colors duration-120 hover:text-ink"
            >
              Cancel
            </button>
          </div>
          {notice ? (
            <p role="status" className="mt-2 text-center text-[11px] font-bold text-ink-soft">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

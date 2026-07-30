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
 * PET-04 — the feed sheet. Lists the user's owned food (`foodInventoryForUser()`,
 * fetched once by `/zoo` and shared across every `AnimalCard`, since inventory
 * is per-user, not per-animal) and lets you pick one to feed.
 *
 * Built on the same native-`<dialog>` bottom sheet as `CreateTaskSheet`
 * (TASK-02) — platform focus-trap, Escape-to-close, scrim tap, `frame:`
 * centred dialog above 480px.
 *
 * **No `POST /api/pets/[id]/feed` yet** — PET-08 is a separate, unbuilt
 * ticket, so confirming a selection surfaces a "Not connected yet" notice
 * rather than a fetch, same decision `AnimalCard`'s "Pet" button made ahead
 * of PET-07. The sheet stays open so the notice is visible next to the
 * selection, matching `SubtaskList`'s "add" stub before SUB-04 existed.
 */
export function FeedSheet({
  open,
  onOpenChange,
  petName,
  foodItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  foodItems: InventoryItemWithStoreItem[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  const [selectedId, setSelectedId] = useState<string>();
  const [notice, setNotice] = useState<string>();

  // Every open starts clean, same "adjust during render" pattern
  // `CreateTaskSheet` uses rather than an effect that would fire an extra
  // render for the same result.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setSelectedId(undefined);
      setNotice(undefined);
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const selected = foodItems.find((item) => item.id === selectedId);

  function handleFeed() {
    if (!selected) return;
    setNotice(
      `Not connected yet — feeding ${petName} with ${selected.storeItem.name} needs PET-08.`,
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
            Feed {petName}
          </h2>

          {foodItems.length === 0 ? (
            <p className="mb-4 text-[13px] text-ink-soft">
              You don&rsquo;t have any food yet. Buy some in the store first.
            </p>
          ) : (
            <div role="radiogroup" aria-label="Food" className="mb-4 flex flex-col gap-[9px]">
              {foodItems.map((item) => {
                const isSelected = item.id === selectedId;
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
                    <span className="flex size-11 flex-none items-center justify-center rounded-[10px] bg-amber-tint text-amber-text">
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
                      <span className="text-[11px] text-ink-soft">×{item.quantity} owned</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="positive"
              size="full"
              disabled={!selected}
              onClick={handleFeed}
            >
              Feed
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

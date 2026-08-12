"use client";

import { Utensils } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useAchievementUnlock } from "@/components/economy/achievement-unlock-provider";
import { useLevelUp } from "@/components/economy/level-up-provider";
import { Button, buttonClasses } from "@/components/ui/button";
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
 * Wired to PET-08's real `POST /api/pets/[id]/feed` the day that ticket
 * shipped — same "wired the same day" convention `AnimalCard`'s "Pet"
 * button used for PET-07, replacing the "Not connected yet" stub notice.
 * Unlike that button, a successful feed *closes* the sheet (there's nothing
 * left to do once it worked, same as `SubtaskList`'s "add" flow) rather
 * than staying open — `router.refresh()` then updates both the pet's bars
 * and the food list's `×N owned` counts from the server in one round trip,
 * since both live on this same page.
 *
 * `onFed` fires alongside that close, at the user's request for the same
 * floating-heart burst the "Pet" button gets — `AnimalCard` owns
 * `spawnHearts()` (it needs the animal image's own ref to position the
 * burst), so this sheet has no heart logic of its own, just the hook to
 * trigger it once the sheet has started closing.
 */
export function FeedSheet({
  open,
  onOpenChange,
  onFed,
  petId,
  petName,
  foodItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on a successful feed, after the sheet is told to close. */
  onFed?: () => void;
  petId: string;
  petName: string;
  foodItems: InventoryItemWithStoreItem[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const router = useRouter();
  const { celebrate: celebrateAchievements } = useAchievementUnlock();
  const { celebrate: celebrateLevelUp } = useLevelUp();

  const [selectedId, setSelectedId] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [feeding, setFeeding] = useState(false);

  // Every open starts clean, same "adjust during render" pattern
  // `CreateTaskSheet` uses rather than an effect that would fire an extra
  // render for the same result.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setSelectedId(undefined);
      setNotice(undefined);
      setFeeding(false);
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const selected = foodItems.find((item) => item.id === selectedId);

  async function handleFeed() {
    if (!selected) return;
    setFeeding(true);
    setNotice(undefined);
    try {
      const response = await fetch(`/api/pets/${petId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: selected.id }),
      });
      if (!response.ok) {
        setNotice(`Couldn't feed ${petName}. Try again.`);
        return;
      }
      const body = await response.json();
      onOpenChange(false);
      onFed?.();
      celebrateAchievements(body.achievementsUnlocked);
      // PRO-18 — feeding itself grants no XP, but the achievements it can
      // trigger ("feed animals 50 times" etc.) do.
      celebrateLevelUp(body.levelUp);
      router.refresh();
    } catch {
      setNotice("Couldn't reach TaskTails. Check your connection and try again.");
    } finally {
      setFeeding(false);
    }
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
          {foodItems.length === 0 ? (
            // There's nothing to pick, so this replaces the picker entirely
            // rather than showing a "Feed" sheet with nothing feedable in it —
            // same prompt-and-redirect shape as `PetCustomizer`'s empty
            // accessories state below.
            <div className="flex flex-col items-center px-1 pt-2 pb-1 text-center">
              <span className="mb-4 flex size-16 flex-none items-center justify-center rounded-card-lg bg-terracotta-tint text-terracotta">
                <Utensils size={28} strokeWidth={2} aria-hidden />
              </span>
              <h2 id={headingId} className="font-display text-[20px] font-semibold">
                Out of food
              </h2>
              <p className="mt-2 mb-5 text-[13px] leading-[1.5] text-ink-soft">
                {petName}&rsquo;s hungry — grab a snack from the store to feed them.
              </p>
              <Link href="/store" className={buttonClasses()}>
                Go to store
              </Link>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-2 rounded-chip px-3 py-2 text-[13px] font-bold text-ink-soft transition-colors duration-120 hover:text-ink"
              >
                Not now
              </button>
            </div>
          ) : (
            <>
              <h2 id={headingId} className="mb-4 font-display text-[20px] font-semibold">
                Feed {petName}
              </h2>

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

              <div className="flex flex-col items-center gap-2">
                <Button
                  type="button"
                  variant="positive"
                  size="full"
                  disabled={!selected || feeding}
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
                <p role="alert" className="mt-2 text-center text-[11px] font-bold text-urgency-text">
                  {notice}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

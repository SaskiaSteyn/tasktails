import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { StoreItemWithLock } from "@/lib/store";

/**
 * SHR-06 — the full-screen "locked by level" state (`design_handoff`, Module
 * 7 — "State · locked by level"), distinct from STOR-04's locked *card*
 * variant that already renders inline in the store grid. Per the user
 * (2026-08-05): shown when a locked `StoreItemCard` is tapped, in place of
 * the grid — same "swap the content, keep the chrome" pattern `CartPanel`
 * uses for its own empty/confirmation states.
 *
 * The mock draws no action here at all — icon, heading, subtitle, progress
 * bar, levels-to-go label, nothing else. The "Go to store" button was added
 * on the user's explicit direction, styled like SHR-05's own secondary
 * button (same variant/size/`px-5` override), and dismisses back to the
 * grid rather than navigating — there's nowhere else for it to go, since
 * this state already only ever appears on `/store` itself.
 *
 * Progress numbers are derived, not copied from the mock's own "Level 4 · 3
 * to go" example: `percent = level / item.levelRequired`, `levelsToGo =
 * item.levelRequired - level` — checked against that example (level 4 vs a
 * level-7 item: 57% fill, 3 to go) before wiring this up.
 */
export function LockedByLevelState({
  item,
  level,
  onDismiss,
}: {
  item: StoreItemWithLock;
  level: number;
  onDismiss: () => void;
}) {
  const percent = Math.round((level / item.levelRequired) * 100);
  const levelsToGo = item.levelRequired - level;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div
        aria-hidden
        className="mb-4 flex size-16 items-center justify-center rounded-card-lg bg-violet-tint"
      >
        <Lock size={28} strokeWidth={2.2} className="text-violet" />
      </div>
      <p className="font-display text-[17px] font-semibold">
        Locked — Level {item.levelRequired}
      </p>
      <p className="mt-[6px] mb-4 text-[12.5px] text-ink-soft">
        The {item.name.toLowerCase()} unlocks at level {item.levelRequired}.
        You&rsquo;re level {level} — keep completing tasks!
      </p>
      <ProgressBar
        value={percent}
        tone="xp"
        label={`Progress toward Level ${item.levelRequired}`}
        valueText={`Level ${level} of ${item.levelRequired}`}
        className="w-full"
      />
      <p className="mt-[7px] mb-[18px] text-[11px] text-ink-faint">
        Level {level} · {levelsToGo} to go
      </p>
      <Button
        variant="secondary"
        size="inline"
        fullWidth={false}
        className="px-5"
        onClick={onDismiss}
      >
        Go to store
      </Button>
    </div>
  );
}

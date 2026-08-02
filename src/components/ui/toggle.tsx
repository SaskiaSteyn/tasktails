"use client";

import { cn } from "@/lib/cn";

/**
 * Settings toggle switch (PRO-13/14). The mock draws a static two-state pill;
 * README's interaction notes ("Toggles: knob slides") ask for the slide, so
 * the knob's position is a transform, not a swapped `left`/`right`.
 *
 * A real `<button role="switch">`, not a styled checkbox — the whole pill is
 * the tap target and `aria-checked` is what a screen reader needs, matching
 * how the rest of this app builds a "checkbox" that isn't literally one
 * (`radio` tier buttons in `tier-select.tsx`, for the same reason).
 */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[23px] w-10 flex-none rounded-pill transition-colors duration-120 ease-out",
        checked ? "bg-sage" : "bg-checkbox",
        disabled && "opacity-50",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[2.5px] size-[18px] rounded-full bg-white transition-[left] duration-120 ease-out",
          checked ? "left-[19.5px]" : "left-[2.5px]",
        )}
      />
    </button>
  );
}

"use client";

import { useId, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Labelled text input per the style guide's INPUTS card.
 *
 * Resting: `#F6F1E9` fill, 1px `#EBE2D5` border, radius 12.
 * Focused: white fill, 2px terracotta border, 4px focus ring, terracotta label.
 * Error:   2px urgency-red border, red ring, message below the field.
 *
 * The second border pixel and the ring are drawn with `box-shadow` rather than a
 * thicker border so focusing never nudges the layout.
 */

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  error?: string;
  /**
   * Control pinned to the inside-right of the field (e.g. the password reveal
   * toggle). Sized to the field's full height so it stays a usable tap target;
   * the input reserves room for it.
   */
  trailing?: React.ReactNode;
  /** Extra classes for the field wrapper, not the input. */
  className?: string;
};

export function TextField({
  label,
  error,
  trailing,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn("group flex flex-col gap-[5px]", className)}>
      <label
        htmlFor={inputId}
        className={cn(
          "text-[12px] font-bold transition-colors duration-120",
          error
            ? "text-urgency-text"
            : // Keyed to the input specifically, so focusing a trailing control
              // doesn't tint the label while the field border stays neutral.
              "text-ink-soft group-has-[input:focus]:text-terracotta",
        )}
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            // 44px per the style guide's INPUTS card and the Login frame; the
            // Register frame's 42px is the outlier, and a shared primitive
            // follows the component spec.
            "h-[44px] w-full rounded-input border px-[14px] text-[14px] text-ink",
            "outline-none transition-[background-color,border-color,box-shadow] duration-120",
            trailing ? "pr-[42px]" : null,
            error
              ? // Error keeps its red border whether or not the field has focus.
                "border-urgency bg-surface shadow-[0_0_0_1px_var(--color-urgency),0_0_0_5px_rgb(219_76_63/0.14)]"
              : cn(
                  "border-border-input bg-input",
                  "focus:border-terracotta focus:bg-surface",
                  "focus:shadow-[0_0_0_1px_var(--color-terracotta),0_0_0_5px_rgb(226_122_84/0.16)]",
                ),
          )}
          {...props}
        />

        {trailing ? (
          <div className="absolute inset-y-0 right-0 flex items-center">
            {trailing}
          </div>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="text-[11px] font-bold text-urgency-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

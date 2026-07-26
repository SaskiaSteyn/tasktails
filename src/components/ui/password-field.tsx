"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { TextField } from "@/components/ui/text-field";

/**
 * Password input with a reveal toggle.
 *
 * Not in the auth designs — added on request. Keeps the style guide's input
 * treatment untouched and hangs a Lucide eye button inside the right edge
 * (stroke 2.2, `currentColor`, per the handoff's iconography rules).
 *
 * Starts hidden, and each field tracks its own state so revealing the password
 * doesn't also reveal the confirmation.
 */

type PasswordFieldProps = Omit<
  ComponentProps<typeof TextField>,
  "type" | "trailing"
>;

export function PasswordField({ disabled, ...props }: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const Icon = revealed ? EyeOff : Eye;

  return (
    <TextField
      {...props}
      disabled={disabled}
      type={revealed ? "text" : "password"}
      trailing={
        <button
          type="button"
          disabled={disabled}
          onClick={() => setRevealed((current) => !current)}
          // The label carries the state, so screen readers hear the change
          // without needing a separate live region.
          aria-label={revealed ? "Hide password" : "Show password"}
          className={
            "flex h-full w-[42px] items-center justify-center rounded-r-input " +
            "text-ink-soft transition-colors duration-120 " +
            "hover:not-disabled:text-terracotta disabled:text-ink-disabled"
          }
        >
          <Icon size={17} strokeWidth={2.2} aria-hidden />
        </button>
      }
    />
  );
}

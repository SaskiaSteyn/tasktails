"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { usernameSchema } from "@/lib/validation/auth";

/**
 * The handle field from the handoff addendum (§1): leading `@` in the muted
 * tier, value in 700, and a live availability line beneath it. Shared by the
 * onboarding step and the profile editor so both check the same way.
 *
 * The addendum draws the field in its active state — that is the focus state
 * here, matching the style guide's INPUTS card.
 */

export type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; username: string }
  | { state: "taken"; username: string }
  | { state: "invalid"; message: string };

/** Long enough that a typist isn't checked mid-word, short enough to feel live. */
const CHECK_DEBOUNCE_MS = 400;

export function UsernameField({
  label = "Username",
  value,
  onChange,
  onAvailabilityChange,
  disabled,
  autoFocus,
  inputRef,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onAvailabilityChange?: (availability: Availability) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [availability, setAvailability] = useState<Availability>({
    state: "idle",
  });

  const fallbackRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? fallbackRef;

  // Kept in a ref so an inline `onAvailabilityChange` doesn't re-run the check
  // on every parent render. Synced in an effect, never during render.
  const report = useRef(onAvailabilityChange);
  useEffect(() => {
    report.current = onAvailabilityChange;
  });

  useEffect(() => {
    const settle = (next: Availability) => {
      setAvailability(next);
      report.current?.(next);
    };

    const candidate = value.trim();
    if (!candidate) {
      settle({ state: "idle" });
      return;
    }

    const parsed = usernameSchema.safeParse({ username: candidate });
    if (!parsed.success) {
      settle({ state: "invalid", message: parsed.error.issues[0].message });
      return;
    }

    settle({ state: "checking" });

    // Aborting means a slow early response can't overwrite the verdict for
    // whatever is in the field now.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/user/username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
          signal: controller.signal,
        });
        const body = await response.json();

        settle(
          body.available
            ? { state: "available", username: parsed.data.username }
            : { state: "taken", username: parsed.data.username },
        );
      } catch {
        if (!controller.signal.aborted) settle({ state: "idle" });
      }
    }, CHECK_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  const invalid =
    availability.state === "taken" || availability.state === "invalid";

  return (
    <div className="flex flex-col">
      <label
        htmlFor="username"
        className={cn(
          "text-[12px] font-bold transition-colors duration-120",
          invalid ? "text-urgency-text" : "text-ink-soft",
        )}
      >
        {label}
      </label>

      <div
        onClick={() => ref.current?.focus()}
        className={cn(
          "mt-[5px] flex h-[44px] items-center rounded-input px-[13px]",
          "border bg-input transition-[background-color,border-color,box-shadow] duration-120",
          "focus-within:bg-surface",
          invalid
            ? "border-urgency bg-surface shadow-[0_0_0_1px_var(--color-urgency),0_0_0_5px_rgb(219_76_63/0.14)]"
            : cn(
                "border-border-input",
                "focus-within:border-terracotta",
                "focus-within:shadow-[0_0_0_1px_var(--color-terracotta),0_0_0_5px_rgb(226_122_84/0.16)]",
              ),
        )}
      >
        <span aria-hidden className="text-[16px] text-ink-faint">
          @
        </span>
        <input
          ref={ref}
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder="your_username"
          value={value}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby="username-availability"
          onChange={(event) => onChange(event.target.value)}
          // 16px, not the design's 14px — below 16px, iOS Safari/Chrome
          // zooms the whole page in on focus. The "@" above matches it so
          // the two don't sit at mismatched sizes on the same line.
          className="w-full bg-transparent text-[16px] font-bold text-ink outline-none placeholder:font-normal"
        />
      </div>

      <p
        id="username-availability"
        aria-live="polite"
        className="mt-[6px] flex min-h-[16px] items-center text-[11.5px] font-bold"
      >
        {availability.state === "available" ? (
          <span className="flex items-center gap-[5px] text-sage-text">
            <Check size={14} strokeWidth={2.6} className="text-sage" aria-hidden />
            @{availability.username} is available
          </span>
        ) : null}

        {availability.state === "taken" ? (
          <span className="flex items-center gap-[5px] text-urgency-text">
            <X size={14} strokeWidth={2.6} className="text-urgency" aria-hidden />
            @{availability.username} is taken
          </span>
        ) : null}

        {availability.state === "invalid" ? (
          <span className="text-urgency-text">{availability.message}</span>
        ) : null}

        {availability.state === "checking" ? (
          <span className="text-ink-faint">Checking…</span>
        ) : null}
      </p>
    </div>
  );
}

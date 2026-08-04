"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/cn";
import type { UserSettings } from "@/lib/settings";

export type ToggleRow = {
  key: keyof Pick<
    UserSettings,
    "dailyReminder" | "streakAlert" | "soundEffects" | "reduceMotion"
  >;
  label: string;
};

/**
 * PRO-13/14 — one grouped card of toggle rows, shared by NOTIFICATIONS and
 * PREFERENCES (same visual shape, same PATCH endpoint, differing only in
 * copy and which fields they own) rather than two near-duplicate components.
 *
 * Optimistic: a tap flips the switch immediately and PATCHes PRO-15's route
 * in the background, reverting on failure. `router.refresh()` on success so
 * server components reading settings elsewhere — the root layout's
 * `reduceMotion` read, in particular — pick up the change without a manual
 * page reload.
 */
export function SettingsToggleCard({
  title,
  rows,
  initialValues,
}: {
  title: string;
  rows: ToggleRow[];
  initialValues: Record<string, boolean>;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(key: string, next: boolean) {
    const previous = values[key];
    setValues((current) => ({ ...current, [key]: next }));
    setPendingKey(key);
    setError(null);

    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });

      if (!response.ok) {
        setValues((current) => ({ ...current, [key]: previous }));
        setError("Couldn't save that. Try again.");
        return;
      }

      router.refresh();
    } catch {
      setValues((current) => ({ ...current, [key]: previous }));
      setError("Can't reach TaskTails. Check your connection and try again.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section>
      <p className="text-overline mb-[9px]">{title}</p>
      <div className="mb-2 overflow-hidden rounded-[13px] border border-border-track bg-warm">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className={cn(
              "flex items-center justify-between px-[13px] py-[10px]",
              index < rows.length - 1 && "border-b border-border-track",
            )}
          >
            <span className="text-[13px] font-bold">{row.label}</span>
            <Toggle
              checked={values[row.key]}
              onChange={(next) => handleToggle(row.key, next)}
              disabled={pendingKey === row.key}
              label={row.label}
            />
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mb-2 text-[10.5px] font-bold text-urgency-text">
          {error}
        </p>
      ) : null}
    </section>
  );
}

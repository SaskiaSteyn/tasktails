"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  UsernameField,
  type Availability,
} from "@/components/user/username-field";

/**
 * AUTH-07 — change your handle from the profile.
 *
 * The onboarding skip modal promises this ("you can change it at any time from
 * your profile"), so it is the same field and the same availability check the
 * step uses.
 */
export function UsernameCard({ username }: { username: string }) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username);
  const [availability, setAvailability] = useState<Availability>({
    state: "idle",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const candidate = value.trim().toLowerCase();
    if (candidate === username) {
      setEditing(false);
      return;
    }
    if (availability.state === "taken" || availability.state === "invalid") {
      return;
    }

    setPending(true);
    setFormError(null);

    try {
      const response = await fetch("/api/user/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: candidate }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setFormError(
          body?.fieldErrors?.username ??
            body?.error ??
            "Couldn't save that username. Try again.",
        );
        return;
      }

      setEditing(false);
      // The greeting and the header read from the session, so re-render the
      // server components rather than mirroring the new handle in local state.
      router.refresh();
    } catch {
      setFormError("Can't reach TaskTails. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-card border border-border-track bg-warm px-[13px] py-[11px]">
        <div className="min-w-0">
          <p className="text-overline">Username</p>
          <p className="mt-[2px] truncate text-[14px] font-extrabold">
            @{username}
          </p>
        </div>

        <Button
          size="inline"
          variant="secondary"
          fullWidth={false}
          className="px-[14px]"
          onClick={() => {
            setValue(username);
            setFormError(null);
            setEditing(true);
          }}
        >
          Edit
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="rounded-card border border-border-track bg-warm px-[13px] py-[11px]"
    >
      <UsernameField
        value={value}
        onChange={(next) => {
          setValue(next);
          setFormError(null);
        }}
        onAvailabilityChange={setAvailability}
        disabled={pending}
        autoFocus
      />

      <div className="mt-3 flex gap-[9px]">
        <Button
          type="submit"
          size="inline"
          disabled={pending || availability.state === "taken"}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          size="inline"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setValue(username);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>

      {formError ? (
        <p
          role="alert"
          className="mt-[10px] text-center text-[11px] font-bold text-urgency-text"
        >
          {formError}
        </p>
      ) : null}
    </form>
  );
}

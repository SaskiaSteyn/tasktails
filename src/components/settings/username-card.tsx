"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  UsernameField,
  type Availability,
} from "@/components/user/username-field";

/**
 * AUTH-07 — change your handle.
 *
 * **#284 moved this from Profile into Settings → Account**, where the rest
 * of the identity controls already live (email, change password). Profile
 * is the read-only picture of how you are doing; Settings is where you
 * change things about the account, and a handle is an account detail.
 *
 * The onboarding skip modal promises the handle can be changed "at any time
 * from your profile" — the copy there now says Settings to match. It is
 * still the same field and the same availability check that step uses.
 *
 * **#258 — `username` is the stored handle, `null` when there isn't one.** It
 * used to be `displayNameFor(record)`, which substitutes the email's local
 * part for an account that skipped the ONB-04 step — so this card showed
 * `sameet@…` as "@sameet" and, worse, the "nothing actually changed"
 * short-circuit below compared the typed handle against that stand-in.
 * Someone who skipped the step and then set their handle to the obvious
 * thing — the name the card was already showing them — hit `candidate ===
 * username`, watched the editor close, and saved nothing: reported as "saved
 * his new username and it didn't update". A `null` never equals a candidate,
 * so the request always fires for an account that has no handle yet.
 *
 * The unset state now says so rather than showing a stand-in as though it
 * were a handle, and names what the leaderboard calls them meanwhile — the
 * other half of #258 ("it shows participant[x] on the leaderboard"). That
 * fallback is deliberate (see `nameFor()` in `src/lib/leaderboard.ts`: an
 * email's local part is not something to disclose to other participants), so
 * the fix is to make it visible and fixable, not to remove it.
 */
export function UsernameCard({
  username,
  suggestion,
}: {
  /** The stored handle, or `null` for an account that never set one. */
  username: string | null;
  /** What to pre-fill the editor with when there is no handle yet — `displayNameFromEmail()`, the same stand-in the rest of the app greets them by. */
  suggestion: string;
}) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username ?? suggestion);
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
      setFormError(
        "Can't reach TaskTails. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-card border border-border-track bg-warm px-[13px] py-[11px]">
        <div className="min-w-0">
          <p className="text-overline">Username</p>
          {username ? (
            <p className="mt-[2px] truncate text-[14px] font-extrabold">
              @{username}
            </p>
          ) : (
            <>
              <p className="mt-[2px] truncate text-[14px] font-extrabold text-ink-soft">
                Not set
              </p>
              <p className="mt-[2px] text-[11px] leading-[1.4] text-ink-faint">
                The leaderboard shows you by number until you pick one.
              </p>
            </>
          )}
        </div>

        <Button
          size="inline"
          variant="secondary"
          fullWidth={false}
          className="px-[14px]"
          onClick={() => {
            setValue(username ?? suggestion);
            setFormError(null);
            setEditing(true);
          }}
        >
          {username ? "Edit" : "Set"}
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
            setValue(username ?? suggestion);
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

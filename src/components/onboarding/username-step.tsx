"use client";

import { AtSign, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  UsernameField,
  type Availability,
} from "@/components/user/username-field";
import { cn } from "@/lib/cn";
import { usernameSchema } from "@/lib/validation/auth";

/** Where the step hands off once answered or skipped (ONB-1). */
const AFTER_USERNAME = "/onboarding";

/** ONB-04 — "Choose username", handoff addendum §1. */
export function UsernameStep({
  suggestions,
  skipUsername,
}: {
  suggestions: string[];
  skipUsername: string;
}) {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState<Availability>({
    state: "idle",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  async function claim(candidate: string) {
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

      router.push(AFTER_USERNAME);
    } catch {
      setFormError("Can't reach TaskTails. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    // An empty Continue means the same thing as Skip, so it gets the same
    // explanation rather than an error for leaving an optional step alone.
    if (!username.trim()) {
      setSkipOpen(true);
      return;
    }

    const parsed = usernameSchema.safeParse({ username });
    if (!parsed.success || availability.state === "taken") return;

    void claim(parsed.data.username);
  }

  return (
    <>
    <div className="flex flex-1 flex-col">
        <div className="mx-auto mt-[26px] mb-[14px] flex size-16 items-center justify-center rounded-full bg-terracotta-tint text-terracotta">
          <User size={30} strokeWidth={2.2} aria-hidden />
        </div>

        <h1 className="text-center font-display text-[23px] leading-[1.1] font-semibold">
          Pick a username
        </h1>
        <p className="mt-[6px] mb-[22px] text-center text-[13px] text-ink-soft">
          It&apos;s how TaskTails greets you and how your pets know you.
        </p>

        <form noValidate onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between">
          <div>
            <UsernameField
              value={username}
              onChange={(next) => {
                setUsername(next);
                setFormError(null);
              }}
              onAvailabilityChange={setAvailability}
              disabled={pending}
              inputRef={inputRef}
            />

            {suggestions.length ? (
              <>
                <p className="mt-3 text-overline">Suggestions</p>
                <div className="mt-2 flex flex-wrap gap-[7px]">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setUsername(suggestion);
                        inputRef.current?.focus();
                      }}
                      className={cn(
                        "rounded-pill border border-border-input bg-input px-[11px] py-[6px]",
                        "text-[12px] font-bold text-ink-soft transition-colors duration-120",
                        "hover:not-disabled:border-terracotta hover:not-disabled:text-terracotta",
                      )}
                    >
                      @{suggestion}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-col">
            <Button
              type="submit"
              disabled={pending || availability.state === "taken"}
              className="mt-5"
            >
              {pending ? "Saving…" : "Continue"}
            </Button>

            {/* WCAG 2.2 SC 2.5.8 — the label alone is a 20px-tall target. The
                padding takes it to 32px and the top margin drops by the same 6px,
                so the gap the design draws is unchanged (INF-14). */}
            <button
              type="button"
              disabled={pending}
              onClick={() => setSkipOpen(true)}
              className="mt-[6px] py-[6px] text-center text-[13px] font-bold text-ink-soft hover:text-ink"
            >
              Skip for now
            </button>
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
      </div>

      {/* Informational, not a nag: it says what happens and lets you carry on.
          This is a study instrument, and a dialog that pressures people to
          finish an optional step would be a stimulus of its own. */}
      <Modal
        open={skipOpen}
        icon={AtSign}
        iconTint="terracotta"
        title={`We'll call you @${skipUsername}`}
        body="Skipping picks a handle from your email for you. You can change it at any time from your profile."
        confirmLabel="Sounds good"
        cancelLabel="Let me pick one"
        onConfirm={() => {
          setSkipOpen(false);
          void claim(skipUsername);
        }}
        onCancel={() => {
          setSkipOpen(false);
          inputRef.current?.focus();
        }}
      />
    </>
  );
}

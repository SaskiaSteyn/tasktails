"use client";

import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * Submit half of {@link LogoutButton} — split out purely so the form itself
 * can stay a server component and own the `signOut` action. `useFormStatus`
 * gives the pending label without any state of its own.
 *
 * SHR-03's second consumer (after the onboarding username step) — the
 * ticket names this as one of its two intended uses. The visible button is
 * `type="button"`, not `type="submit"`, so it can only open the confirm
 * modal; the form's real submit is a hidden button the modal's confirm
 * clicks via a ref, so there's no way to skip the confirmation step.
 */
export function LogoutSubmit({
  children,
  fullWidth = true,
}: {
  children: ReactNode;
  /** `false` for a spot like the admin header, sitting inline beside other content rather than owning a whole row. */
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        type="button"
        size="inline"
        variant="destructive-outline"
        fullWidth={fullWidth}
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        {pending ? "Logging out…" : children}
      </Button>
      <button ref={submitRef} type="submit" className="hidden" aria-hidden tabIndex={-1} />

      <Modal
        open={confirmOpen}
        icon={LogOut}
        iconTint="destructive"
        title="Log out?"
        body="You'll need to sign in again to get back to your tasks."
        confirmLabel="Log out"
        confirmVariant="destructive"
        cancelLabel="Stay signed in"
        onConfirm={() => {
          setConfirmOpen(false);
          submitRef.current?.click();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

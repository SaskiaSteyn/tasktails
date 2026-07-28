"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Submit half of {@link LogoutButton} — split out purely so the form itself can
 * stay a server component and own the `signOut` action. `useFormStatus` gives
 * the pending label without any state of its own.
 */
export function LogoutSubmit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="inline"
      variant="destructive-outline"
      disabled={pending}
    >
      {pending ? "Logging out…" : children}
    </Button>
  );
}

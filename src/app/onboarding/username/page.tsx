import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthScreen } from "@/components/auth/auth-screen";
import { UsernameStep } from "@/components/onboarding/username-step";
import {
  findUserByEmail,
  generateUsername,
  suggestUsernames,
} from "@/lib/users";

export const metadata: Metadata = {
  title: "Pick a username · TaskTails",
  description: "Choose the handle TaskTails knows you by.",
};

/**
 * ONB-04 — the username step, between Register and the onboarding checklist.
 * Drawn in the handoff addendum (§1 "Choose username").
 */
export default async function UsernamePage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const record = await findUserByEmail(email);
  // Already answered — nobody should be sent back through it.
  if (record?.username) redirect("/onboarding");
  if (!record) redirect("/login");

  const [suggestions, skipUsername] = await Promise.all([
    suggestUsernames(record),
    generateUsername(record),
  ]);

  return (
    <AuthScreen>
      <UsernameStep suggestions={suggestions} skipUsername={skipUsername} />
    </AuthScreen>
  );
}

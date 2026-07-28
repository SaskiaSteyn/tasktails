import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
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
    <main className="flex flex-1 justify-center bg-board sm:items-center sm:p-6">
      <div className="flex w-full flex-col bg-surface px-6 py-[26px] sm:min-h-[640px] sm:max-w-[400px] sm:rounded-frame sm:border sm:border-[rgb(46_42_38/0.06)] sm:shadow-card">
        <UsernameStep
          suggestions={suggestions}
          skipUsername={skipUsername}
        />
      </div>
    </main>
  );
}

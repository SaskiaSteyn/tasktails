import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { UsernameCard } from "@/components/profile/username-card";
import { displayName, findUserByEmail } from "@/lib/mock/users";

export const metadata: Metadata = {
  title: "Profile · TaskTails",
};

/**
 * Partial Profile screen — AUTH-07 (change your username) only.
 *
 * The designed Profile frame also carries an avatar, lifetime stats, buy-XP and
 * achievements; those belong to their own tickets and are deliberately absent.
 * The frame's "STUDY GROUP B" chip is left out on purpose too: AUTH-04 keeps the
 * assignment off the wire because participants must not learn which arm they are
 * in, and a chip on their own profile would undo that.
 */
export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const record = findUserByEmail(email);
  if (!record) redirect("/login");

  return (
    <main className="flex flex-1 justify-center bg-board sm:items-center sm:p-6">
      <div className="flex w-full flex-col bg-surface px-6 py-[26px] sm:min-h-[640px] sm:max-w-[400px] sm:rounded-frame sm:border sm:border-[rgb(46_42_38/0.06)] sm:shadow-card">
        <h1 className="font-display text-[19px] leading-[1.15] font-semibold">
          {displayName(record)}
        </h1>
        <p className="mt-[2px] mb-[18px] text-[11.5px] text-ink-soft">
          {record.email}
        </p>

        <UsernameCard username={record.username ?? displayName(record)} />

        <div className="min-h-2 flex-1" />

        <p className="text-center text-[10.5px] leading-[1.4] text-ink-faint">
          The rest of this screen — stats, achievements and your sanctuary — is
          still to be built.
        </p>
      </div>
    </main>
  );
}

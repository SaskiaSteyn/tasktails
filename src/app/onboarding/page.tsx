import { auth } from "@/auth";

/**
 * Placeholder landing spot after registration so the sign-up flow can be tested
 * end to end. The real screen ("Your first three quests") is ONB-01/ONB-02.
 */
export default async function OnboardingPage() {
  const session = await auth();

  return (
    <main className="flex flex-1 items-center justify-center bg-board p-6">
      <div className="flex w-full max-w-[400px] flex-col gap-2 rounded-card-lg border border-border-track bg-surface p-6 shadow-card">
        <p className="text-overline text-terracotta">
          Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
        </p>
        <h1 className="text-section">Your first three quests</h1>
        <p className="text-secondary">
          This screen is still to be built — ONB-01. You&apos;re signed in, so
          registration worked.
        </p>
      </div>
    </main>
  );
}

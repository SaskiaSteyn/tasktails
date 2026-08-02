import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PersistentHeader } from "@/components/layout/persistent-header";
import { SessionTracker } from "@/components/telemetry/session-tracker";
import { StoreTimeTracker } from "@/components/telemetry/store-time-tracker";
import { redirectAdminsAway } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Store · TaskTails",
};

/**
 * Placeholder landing spot for `BottomNav`'s "Store" tab (SHR-01) so it
 * doesn't 404. The real screen is STOR-01+.
 */
export default async function StorePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await redirectAdminsAway(session.user.id);

  return (
    <AppShell header={<PersistentHeader title="Store" />} nav={<BottomNav />}>
      <SessionTracker />
      <StoreTimeTracker />
      <ComingSoon
        icon={ShoppingBag}
        title="Store is on its way"
        description="Spend your coins on food, accessories and new animals — coming soon."
      />
    </AppShell>
  );
}

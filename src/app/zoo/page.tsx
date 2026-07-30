import { PawPrint } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PersistentHeader } from "@/components/layout/persistent-header";

export const metadata: Metadata = {
  title: "Zoo · TaskTails",
};

/**
 * Placeholder landing spot for `BottomNav`'s "Zoo" tab (SHR-01) so it doesn't
 * 404. The real sanctuary screen is PET-01+.
 */
export default async function ZooPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppShell header={<PersistentHeader title="Zoo" />} nav={<BottomNav />}>
      <ComingSoon
        icon={PawPrint}
        title="Your sanctuary is growing"
        description="Once you bring home your first animal, they'll live here — coming soon."
      />
    </AppShell>
  );
}

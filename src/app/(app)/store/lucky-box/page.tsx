import { ChevronLeft, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { LuckyBoxHome } from "@/components/store/lucky-box-home";
import { currentEconomy } from "@/lib/economy";
import { LUCKY_BOX_COST_COINS } from "@/lib/gacha";

export const metadata: Metadata = {
  title: "Lucky Box · TaskTails",
};

/**
 * GACHA-12 — `/store/lucky-box`, per the approved design board's "Lucky Box
 * · home" frame. A focused flow, not tab content — no `BottomNav`, same call
 * `CartPage` (STOR-06) and `EditTaskPage` make for the same reason.
 *
 * Bespoke header (back chevron + "Lucky Box" + info-icon button), built the
 * same way `CartPage`'s is — neither is `PersistentHeader`'s title variant,
 * which always carries a coin pill the design board doesn't draw here. The
 * back chevron is a real link (`/store` already exists); the info icon now
 * is too, wired to `GACHA-15`'s `/store/lucky-box/odds` once that route
 * shipped — it rendered matching the design board but inert before then,
 * same "render the control, wire it up later" pattern `GACHA-10`'s Open
 * button used.
 */
export default async function LuckyBoxPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const economy = await currentEconomy();

  return (
    <AppShell
      header={
        <header className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] py-[14px]">
          <Link
            href="/store"
            aria-label="Back to store"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-[17px] leading-[1.15] font-semibold">
            Lucky Box
          </h1>
          <Link
            href="/store/lucky-box/odds"
            aria-label="Drop rates"
            className="flex size-[32px] flex-none items-center justify-center rounded-full border border-border-track bg-surface text-ink-soft hover:text-ink"
          >
            <Info size={16} strokeWidth={2.2} aria-hidden />
          </Link>
        </header>
      }
      className="desk:mx-auto desk:w-full desk:max-w-[640px] desk:py-8"
    >
      {/* The drop-rates link from the phone header, hidden from `desk:` up —
          same reason, and same fix, as `/store/cart`'s history link. */}
      <div className="mb-3 hidden flex-none justify-end desk:flex">
        <Link
          href="/store/lucky-box/odds"
          className="flex items-center gap-[6px] text-[12.5px] font-bold text-terracotta hover:text-terracotta-hover"
        >
          <Info size={15} strokeWidth={2.2} aria-hidden />
          Drop rates
        </Link>
      </div>
      <LuckyBoxHome price={LUCKY_BOX_COST_COINS} coins={economy?.coins ?? 0} />
    </AppShell>
  );
}

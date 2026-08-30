import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import type { StoreItemRarity } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import { RARITY_ODDS } from "@/lib/gacha";

export const metadata: Metadata = {
  title: "Drop rates · TaskTails",
};

/**
 * GACHA-15 — `/store/lucky-box/odds`, per the approved design board's "Odds
 * detail" frame. Reachable only via the info icon on `GACHA-12`'s Lucky Box
 * home, now wired there. No pity anywhere on this screen, per the ticket's
 * own wording: reads straight off `GACHA-06`'s `RARITY_ODDS` constant, never
 * importing `HARD_PITY_THRESHOLD`/`pullsSinceLegendary` at all.
 *
 * Pure server component reading `RARITY_ODDS` directly rather than calling
 * `GET /api/gacha/odds` (`GACHA-06`) — the same "no client interactivity, no
 * reason to leave the server render" call `lucky-box/page.tsx` already made
 * for `LUCKY_BOX_COST_COINS`. `GACHA-06`'s route is unchanged and untouched
 * by this — it stays available for any future non-server-rendered consumer.
 *
 * Row order/colours are declared locally (`RARITY_ROWS`) rather than
 * imported from `gacha.ts` — `RARITY_ORDER` there is an unexported
 * implementation detail of `rollRarity()`, and which colour paints which
 * rarity is a presentation concern, not gacha logic (`lucky-box-home.tsx`'s
 * own `RARITY_STYLE` already made the same call for the reveal screen).
 * Every token below is an exact hex match to the design board's raw values
 * except where a token audit already superseded one — `ink-soft` and
 * `amber-text`, the same substitution `RARITY_STYLE` already uses.
 * Legendary alone gets the warm `amber-tint`/`amber-ring` row background the
 * design board draws for it; the other three share the neutral
 * `bg-warm`/`border-border-track` every other row uses.
 */
const RARITY_ROWS: {
  rarity: StoreItemRarity;
  label: string;
  dot: string;
  text: string;
  rowBg: string;
  rowBorder: string;
}[] = [
  {
    rarity: "COMMON",
    label: "Common",
    dot: "bg-tier-trivial",
    text: "text-ink-soft",
    rowBg: "bg-warm",
    rowBorder: "border-border-track",
  },
  {
    rarity: "RARE",
    label: "Rare",
    dot: "bg-sage",
    text: "text-sage-text",
    rowBg: "bg-warm",
    rowBorder: "border-border-track",
  },
  {
    rarity: "EPIC",
    label: "Epic",
    dot: "bg-violet",
    text: "text-violet-text",
    rowBg: "bg-warm",
    rowBorder: "border-border-track",
  },
  {
    rarity: "LEGENDARY",
    label: "Legendary",
    dot: "bg-amber",
    text: "text-amber-text",
    rowBg: "bg-amber-tint",
    rowBorder: "border-amber-ring",
  },
];

export default async function LuckyBoxOddsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppShell
      header={
        <header className="flex flex-none items-center gap-2 border-b border-border-track px-[18px] py-[14px]">
          <Link
            href="/store/lucky-box"
            aria-label="Back to Lucky Box"
            className="-m-1 flex items-center p-1 text-ink-soft hover:text-ink"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-[17px] leading-[1.15] font-semibold">
            Drop rates
          </h1>
        </header>
      }
      className="p-[18px] desk:mx-auto desk:w-full desk:max-w-[640px] desk:py-8"
    >
      <p className="text-overline mb-[10px]">Odds per pull</p>

      <div className="flex flex-col gap-2">
        {RARITY_ROWS.map((row) => (
          <div
            key={row.rarity}
            className={cn(
              "flex items-center gap-[10px] rounded-input border px-[13px] py-[11px]",
              row.rowBg,
              row.rowBorder,
            )}
          >
            <span aria-hidden className={cn("size-[9px] flex-none rounded-full", row.dot)} />
            <span className="flex-1 text-[13.5px] font-bold">{row.label}</span>
            <span className={cn("text-[13.5px] font-extrabold", row.text)}>
              {Math.round(RARITY_ODDS[row.rarity] * 100)}%
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

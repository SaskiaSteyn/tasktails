import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { LuckyBoxReveal } from "@/components/store/lucky-box-reveal";
import { currentEconomy } from "@/lib/economy";
import { ownedLuckyBox } from "@/lib/gacha";
import { luckyBox } from "@/lib/lucky-boxes";

export const metadata: Metadata = {
  title: "Lucky box · TaskTails",
};

/**
 * Opening a box (`design_handoff_lucky_boxes` 1e–1g). A focused flow — no
 * bottom nav, same call the cart makes — and full-bleed, not the phone card,
 * from `frame:` up.
 *
 * Only a fully revealed box sends you back to My boxes. An opened box whose
 * reveal was left unfinished deals its stored results again, face down —
 * overriding README §7 rule 5 at the user's direction (2026-09-13). The open
 * is requested by the client on mount and is idempotent, so a refresh before
 * it lands simply opens it then, and a resume just reads the results back.
 */
export default async function LuckyBoxRevealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const { id } = await params;
  const [box, economy] = await Promise.all([
    ownedLuckyBox(userId, id),
    currentEconomy(),
  ]);
  if (!box || box.revealedAt) redirect("/store/boxes");

  const { name, itemCount } = luckyBox(box.boxKey);

  return (
    <AppShell fullBleed>
      <LuckyBoxReveal
        boxId={box.id}
        name={name}
        itemCount={itemCount}
        resuming={box.openedAt !== null}
        coins={economy?.coins ?? 0}
      />
    </AppShell>
  );
}

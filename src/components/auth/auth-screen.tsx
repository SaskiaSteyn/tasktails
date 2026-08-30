import { Check } from "lucide-react";
import Image from "next/image";

import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/cn";

/**
 * Shell shared by the auth screens (Register, Login, the username step).
 *
 * The frame itself — edge-to-edge on a phone, a centred 400px card from `frame:`
 * up — is `AppShell`, so the auth screens and the app screens cannot drift apart
 * (INF-13, NFR-GEN-2). All this adds is the screens' own padding, and the
 * absence of a header or a nav.
 *
 * From `xl:` up (INF-22) the handoff splits it: a 600px terracotta brand
 * panel on the left, the form centred in a 420px column on the right. The
 * panel is `xl:` rather than `desk:` because 600px of it against a 900px
 * viewport leaves 300px for a 420px form — measured live, the form overflowed
 * under the panel. Between `desk:` and `xl:` the form simply centres on the
 * full width instead. The panel's headline and supporting copy are the
 * marketing hero's own
 * (`marketing-hero.tsx`), not new wording — the handoff's rule 2 is that copy
 * comes from the codebase, and this is the same first-impression sentence the
 * landing page already makes.
 *
 * `brand` is off for the onboarding username step, which uses this shell for
 * its frame but is a step *inside* the app, not a front door — the handoff
 * draws that flow as a plain centred card with no marketing panel.
 *
 * The panel holds nothing focusable, so unlike the welcome screen and the
 * level-up celebration — the app's other terracotta grounds — it needs no
 * `--focus-ring` override. Anything interactive added to it later would: see
 * the focus-ring caveat in globals.css, and copy the white ring plus dark halo
 * `WelcomeScreen` uses, not just the ring.
 */
export function AuthScreen({
  children,
  brand = true,
}: {
  children: React.ReactNode;
  brand?: boolean;
}) {
  return (
    <AppShell className="px-6 py-[26px] desk:flex-row desk:p-0">
      {brand ? <AuthBrandPanel /> : null}
      <div className="flex flex-col desk:flex-1 desk:items-center desk:justify-center desk:overflow-y-auto desk:p-14">
        <div className="w-full desk:max-w-[420px]">{children}</div>
      </div>
    </AppShell>
  );
}

/** The three things the app actually does, stated without embellishment. */
const BRAND_POINTS = [
  "Five task sizes, from Trivial to Epic",
  "Coins and XP on every completed task",
  "Animals to adopt, feed and customise",
];

function AuthBrandPanel() {
  return (
    <aside className="hidden w-[600px] flex-none flex-col gap-9 bg-terracotta px-16 py-14 xl:flex">
      <Image
        src="/brand/horizontal-light.svg"
        alt="TaskTails"
        width={200}
        height={40}
        priority
        className="h-[34px] w-auto self-start"
      />

      <div className="mt-8 flex flex-col gap-5">
        <p className="max-w-[520px] font-display text-[52px] leading-[1.12] font-semibold text-white text-pretty">
          Do your tasks. Raise a zoo of little friends.
        </p>
        <p className="max-w-[460px] text-[17px] leading-[1.6] font-semibold text-brand-soft">
          TaskTails turns your to-do list into a game. Complete tasks to earn
          coins and XP, then spend them feeding, petting and customising your
          very own sanctuary.
        </p>
      </div>

      <ul className="flex max-w-[420px] flex-col gap-3">
        {BRAND_POINTS.map((point) => (
          <li
            key={point}
            className="flex items-center gap-3 rounded-[14px] bg-white/15 px-[17px] py-[13px] text-[14px] font-bold text-white"
          >
            <Check size={18} strokeWidth={2.4} aria-hidden className="flex-none" />
            {point}
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * The terracotta fox-in-badge mark that heads each auth screen. The two frames
 * space it differently (Register 2/14, Login 24/16), so the margins are the
 * screen's to pass in.
 */
export function AuthBrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/icon.svg"
      alt="TaskTails"
      width={60}
      height={60}
      priority
      // Hidden from `xl:` up, where the brand panel beside the form is
      // already carrying the mark.
      className={cn("mx-auto block size-[60px] xl:hidden", className)}
    />
  );
}

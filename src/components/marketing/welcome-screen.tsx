import { Gem, PawPrint } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Coin } from "@/components/ui/coin";
import { cn } from "@/lib/cn";

/**
 * MKT-03 — the Landing / welcome screen ("Landing / welcome" in
 * `design_handoff/TaskTails Screens.dc.html`): the public entry point at phone
 * and tablet widths, and the only screen in the app drawn as a full-bleed
 * terracotta fill.
 *
 * The frame is `AppShell`'s, copied rather than reused, for two reasons the
 * shell has no prop for: its card is `bg-surface` with no way to say otherwise,
 * and it mounts the level-up and achievement providers, which are client
 * components with nothing to celebrate on a signed-out page. `LevelUpScreen`
 * makes the same call for the same first reason. Everything else — the 480px
 * `frame:` switch, the 400×640 card, the 34px radius — is deliberately
 * identical, so this screen and the Register screen it hands off to are the
 * same shape at every width (INF-13, NFR-GEN-2).
 *
 * The three chips carry Lucide marks where the frame draws bare geometry (an
 * amber ringed disc, a sage circle, a violet diamond): the shapes are the
 * designer's shorthand for an icon set that AGENTS.md pins to lucide-react. The
 * first is the exception — `Coin` *is* the amber-disc-with-a-lighter-ring the
 * handoff specifies, so the chip about earning coins uses the real thing.
 *
 * ACCESSIBILITY — terracotta is the one ground in this palette where nothing
 * reaches 3:1 (see the `--focus-ring` caveat in globals.css), so every ratio
 * here is a documented AA exception, drawn as designed and identical to the
 * ones the level-up celebration already accepts:
 *
 *     white on terracotta       — title, chip labels   2.86 BPCA
 *     #FBE3D8 on terracotta     — supporting copy      2.54
 *     terracotta on white       — "Get started"        2.69
 *     white on the 16% chip     — chip labels          2.40
 *
 * The focus ring is not left as-is: globals.css asks a container on a saturated
 * fill to set `--focus-ring` itself, so this one switches it to white and adds a
 * dark halo underneath — the same two-tone treatment, for the same reason, since
 * neither white nor ink clears 3:1 on terracotta alone.
 */

const CHIPS = [
  {
    mark: <Coin size={12} />,
    label: "Earn coins & XP for every task",
  },
  {
    mark: <PawPrint size={14} strokeWidth={2.4} className="text-sage" aria-hidden />,
    label: "Feed & pet your growing zoo",
  },
  {
    mark: <Gem size={14} strokeWidth={2.4} className="text-violet" aria-hidden />,
    label: "Level up to unlock rare animals",
  },
];

export function WelcomeScreen({ className }: { className?: string }) {
  return (
    <div
      style={{ "--focus-ring": "#fff" } as React.CSSProperties}
      // The caller supplies the `display` (`hidden standalone:flex`), so the
      // base list deliberately carries no `flex` of its own — `cn` is a plain
      // join, not tailwind-merge, and two display utilities would both survive
      // with stylesheet order deciding. Same arrangement `MarketingSite` uses.
      className={cn(
        "min-h-0 flex-1 justify-center bg-board frame:items-center frame:p-6 [&_:focus-visible]:shadow-[0_0_0_5px_rgb(46_42_38/0.45)]",
        className,
      )}
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-terracotta frame:h-[640px] frame:max-w-app frame:rounded-frame frame:border frame:border-[rgb(46_42_38/0.06)] frame:shadow-card">
        <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-[26px] pt-[14px] pb-6 text-center">
          {/* Not `icon-light.svg`, which the handoff names here. That file is
              byte-identical to `icon.svg`, and correctly so — "-light" only ever
              recolours the ink wordmark across this asset set, and the icon has
              none. It reads on white and on ink but not on terracotta, where the
              mark's own forehead band merges with the ground and the badge
              collapses into two floating blobs. `icon-on-brand.svg` is the same
              geometry one shade apart; the file says why. The footer keeps
              `icon-light.svg`, which is right on ink. */}
          <Image
            src="/brand/icon-on-brand.svg"
            alt="TaskTails"
            width={120}
            height={120}
            priority
            className="mt-5 block size-[120px] flex-none"
          />

          <h1 className="mt-[18px] text-brand-title text-white">
            Do tasks.
            <br />
            Raise pets.
          </h1>

          <p className="mt-[10px] text-[13.5px] leading-[1.45] text-brand-soft">
            Turn your to-do list into a cosy sanctuary. Finish tasks, earn coins,
            and grow a zoo of little friends.
          </p>

          <ul className="mt-5 flex w-full flex-none flex-col gap-2">
            {CHIPS.map((chip) => (
              <li
                key={chip.label}
                className="flex items-center gap-[11px] rounded-input bg-white/16 px-[13px] py-[10px]"
              >
                <span className="flex size-[26px] flex-none items-center justify-center rounded-chip bg-surface">
                  {chip.mark}
                </span>
                <span className="text-left text-[12.5px] font-bold text-white">
                  {chip.label}
                </span>
              </li>
            ))}
          </ul>

          {/* Pushes the actions to the bottom of the frame, per the drawn
              spacer. `mt-auto` on a flex child rather than a filler div, and
              `pt-8` so the chips can never sit flush against the button on a
              short viewport. */}
          <div className="mt-auto flex w-full flex-none flex-col items-center pt-8">
            <Link
              href="/register"
              className={buttonClasses({ variant: "on-brand", size: "hero" })}
            >
              Get started
            </Link>

            <p className="mt-[14px] text-[13px] text-white">
              Already have an account?{" "}
              <Link href="/login" className="font-extrabold text-white underline">
                Log in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

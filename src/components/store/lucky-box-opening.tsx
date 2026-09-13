import { BoxArt } from "@/components/store/lucky-box-card";

/**
 * GACHA-13 — the beat between tapping Open and the fan (1e). Extends the
 * shipped beat rather than replacing it: the same amber well and soft glow,
 * now with the open-box art, a pop, a lifting lid and two rings raying out,
 * all on one 1.4s loop. `LuckyBoxReveal` enforces the 1.5s minimum; this is
 * purely the visual. Under reduced motion the globals.css rules stop every
 * loop dead, leaving the static well and the same copy.
 *
 * The glow and rings are children of the well (`relative`) and centred with
 * `left-1/2 top-1/2`, not left to flex static position — the positioning
 * trap the original ring fell into (2026-08-08).
 */
export function LuckyBoxOpening({ itemCount }: { itemCount: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-hidden">
      <div className="relative flex size-[104px] animate-box-pop items-center justify-center rounded-[22px] bg-amber-tint">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 size-[260px] animate-glow-pulse rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(229,169,60,.16) 0%, rgba(229,169,60,0) 70%)",
          }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 -mt-[75px] -ml-[75px] size-[150px] animate-ray-out rounded-full border-2 border-amber/35"
        />
        <span
          aria-hidden
          style={{ animationDelay: "0.35s" }}
          className="absolute top-1/2 left-1/2 -mt-[75px] -ml-[75px] size-[150px] animate-ray-out rounded-full border-2 border-amber/20"
        />
        <BoxArt open height={74} className="relative animate-lid-lift" />
      </div>
      <p
        role="status"
        className="mt-[26px] font-display text-[15px] font-semibold"
      >
        Opening…
      </p>
      <p className="mt-[6px] text-[11.5px] font-bold text-ink-faint">
        {itemCount} {itemCount === 1 ? "card" : "cards"} on the way
      </p>
    </div>
  );
}

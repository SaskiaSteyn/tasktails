import { Gift } from "lucide-react";

/**
 * GACHA-13 — the ~1.5s beat between tapping Open and the reveal, per the
 * approved design board's "Lucky Box · opening moment" frame — the same
 * "moment" pattern `LevelUpProvider`'s celebration screen uses (a brief,
 * self-contained transitional state, not tied to how long the request
 * actually takes). `LuckyBoxHome` (`GACHA-12`) enforces the minimum
 * duration; this component is purely the visual.
 *
 * **Corrected 2026-08-08, found live**: the design board draws a dashed
 * rotating ring around the icon plus a soft glow behind it, both as
 * `position: absolute` with no `top`/`left` set — relying on the browser's
 * "static position" fallback to center them, which doesn't hold up inside a
 * `flex-col` stack (the ring rendered off-center from the icon/text instead
 * of concentric with them). Dropped the ring at the user's call rather than
 * chase the positioning further for an element judged not to earn its
 * keep. The glow stays, but is now a child of the icon well itself
 * (`relative`) and centered on it with `left-1/2 top-1/2` + a transform,
 * which doesn't depend on flex static-position layout at all.
 */
export function LuckyBoxOpening() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-hidden">
      <div className="relative flex size-[104px] items-center justify-center rounded-[22px] bg-amber-tint">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(229,169,60,.16) 0%, rgba(229,169,60,0) 70%)",
          }}
        />
        <Gift size={48} strokeWidth={1.7} className="relative text-amber-text" aria-hidden />
      </div>
      <p role="status" className="mt-[26px] font-display text-[15px] font-semibold">
        Opening…
      </p>
    </div>
  );
}

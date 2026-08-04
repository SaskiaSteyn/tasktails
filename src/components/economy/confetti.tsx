import { cn } from "@/lib/cn";

/**
 * Confetti, fixed rather than random. Shared by every full-bleed celebration
 * screen (ECO-07's level-up, and the achievement unlock screen) — extracted
 * from `LevelUpScreen` once a second screen needed the same effect, so the
 * piece layout/timing can't drift between them.
 *
 * Deterministic because these screens render on the server first: `Math.random`
 * would place the pieces differently on the client and React would throw a
 * hydration mismatch. Sizes, angles and colours are the level-up addendum's —
 * 7–9px, 12–40°, amber / violet / sage / cream.
 *
 * `top` is where a piece *starts*, kept in the upper half so the opening frame
 * matches the addendum's static composition; the fall then carries every piece
 * the full height of the screen and out of the bottom. `delay` and `duration`
 * are staggered so they do not descend as one sheet.
 */
const CONFETTI = [
  { left: 8, top: 6, size: 8, rotate: 24, tone: "amber", round: false, delay: 0, duration: 2.9 },
  { left: 22, top: 14, size: 7, rotate: 0, tone: "violet", round: true, delay: 0.42, duration: 3.4 },
  { left: 35, top: 4, size: 9, rotate: 38, tone: "sage", round: false, delay: 0.16, duration: 2.5 },
  { left: 48, top: 17, size: 7, rotate: 12, tone: "cream", round: false, delay: 0.7, duration: 3.1 },
  { left: 61, top: 7, size: 8, rotate: 0, tone: "amber", round: true, delay: 0.28, duration: 3.6 },
  { left: 74, top: 15, size: 7, rotate: 31, tone: "violet", round: false, delay: 0.56, duration: 2.7 },
  { left: 88, top: 5, size: 9, rotate: 18, tone: "sage", round: false, delay: 0.09, duration: 3.2 },
  { left: 14, top: 27, size: 7, rotate: 0, tone: "cream", round: true, delay: 0.8, duration: 2.6 },
  { left: 29, top: 34, size: 8, rotate: 40, tone: "amber", round: false, delay: 0.35, duration: 3.5 },
  { left: 55, top: 31, size: 7, rotate: 21, tone: "sage", round: false, delay: 0.63, duration: 2.8 },
  { left: 68, top: 38, size: 8, rotate: 0, tone: "violet", round: true, delay: 0.21, duration: 3.3 },
  { left: 82, top: 29, size: 7, rotate: 15, tone: "cream", round: false, delay: 0.49, duration: 2.4 },
  { left: 43, top: 44, size: 7, rotate: 33, tone: "amber", round: false, delay: 0.86, duration: 3.0 },
  { left: 95, top: 40, size: 7, rotate: 0, tone: "sage", round: true, delay: 0.47, duration: 2.6 },
] as const;

const DEFAULT_TONES: Record<string, string> = {
  amber: "bg-amber-ring",
  violet: "bg-violet",
  sage: "bg-sage",
  cream: "bg-brand-soft",
};

/**
 * `tones` lets a screen recolour whichever piece would otherwise vanish
 * against its own background — the achievement unlock screen's violet
 * ground swaps the `violet` piece for terracotta, since violet-on-violet
 * confetti wouldn't read as confetti at all.
 */
export function Confetti({ tones }: { tones?: Partial<Record<string, string>> } = {}) {
  const resolved = tones ? { ...DEFAULT_TONES, ...tones } : DEFAULT_TONES;

  return (
    // Decorative only — never announced. The celebration is carried by the
    // heading, which screen readers get instead.
    //
    // Full height, and `--confetti-fall` is the distance a piece travels: past
    // the bottom edge on both shapes the screen takes, so nothing is left
    // hanging in mid-air when the animation ends. `overflow-hidden` clips them
    // as they leave.
    //
    // One pass, not a loop. Motion that runs indefinitely behind text is a
    // WCAG 2.2.2 (Pause, Stop, Hide) obligation, and a pause control on a
    // celebration screen would be absurd; a single fall of ~3.5s side-steps it.
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        "[--confetti-fall:calc(100dvh_+_80px)] frame:[--confetti-fall:720px]",
      )}
    >
      {CONFETTI.map((piece, index) => (
        // Two elements: the outer one falls, the inner one holds the angle.
        // Both on one element would mean the keyframes' `transform` wiping out
        // the rotation the moment the animation started.
        <span
          key={index}
          className="absolute motion-safe:animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            top: `${piece.top}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        >
          <span
            className={cn(
              "block",
              piece.round ? "rounded-full" : "rounded-[1px]",
              resolved[piece.tone],
            )}
            style={{
              width: piece.size,
              height: piece.size,
              transform: `rotate(${piece.rotate}deg)`,
            }}
          />
        </span>
      ))}
    </div>
  );
}

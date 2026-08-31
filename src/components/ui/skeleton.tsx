import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * The two loading affordances, built once here because every `loading.tsx` in
 * the app draws them.
 *
 * Neither is in the style guide — the handoff has no loading frame — so they
 * are built from tokens that already exist rather than inventing a colour:
 * a skeleton block is `border-track`, the same hairline/track fill a real
 * progress bar or card border uses, and the spinner is `ink-faint`. Neither
 * uses `--color-urgency`, which AGENTS.md reserves for Group B's false-urgency
 * stimuli and destructive actions — a red spinner on a slow page would read as
 * an error, and worse, would leak the study's one exclusive accent into
 * neutral chrome that both groups see.
 *
 * `animate-pulse` and `animate-spin` are Tailwind's own built-ins, so there
 * are no keyframes of ours to maintain and globals.css's reduce-motion block
 * (OS setting *or* PRO-14's in-app toggle) already stills both without either
 * component knowing about it.
 */

/**
 * One shimmering placeholder block. Size it — and **give it a radius** — with
 * `className`.
 *
 * No default radius on purpose. `cn` is a plain join with no conflict
 * resolution, so a base `rounded-input` here would not lose to a caller's
 * `rounded-full`; the two would race on stylesheet order and the base would
 * usually win. That is not hypothetical — it shipped that way for an hour and
 * turned every circular skeleton (avatars, the level disc, mood faces) into a
 * 12px-radius square. Same trap `EditTaskForm`'s "Save changes" and
 * `AnimalCard`'s button row already document.
 *
 * Omitting a radius therefore gives square corners, which is wrong loudly
 * rather than wrong quietly — the failure you can see beats the one you can't.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse bg-border-track", className)} />;
}

/**
 * Spinning circle, for the places a skeleton can't go — a pending nav tab, a
 * button mid-request — where there is no content shape to stand in for.
 *
 * `aria-hidden` and no text of its own: every caller sits inside something
 * that already announces the wait (a `role="status"` region, or a disabled
 * button whose label still reads), so a second announcement would just be
 * noise.
 */
export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <LoaderCircle
      size={size}
      strokeWidth={2.2}
      aria-hidden
      className={cn("animate-spin text-ink-faint", className)}
    />
  );
}

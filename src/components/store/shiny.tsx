import { Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * #276 §4 — the Shiny treatment.
 *
 * Shiny is a boolean on the **owned instance**, never a tier and never a
 * catalogue property: the store grid can therefore never show one, because
 * it draws catalogue items. It appears on the surfaces that draw something
 * someone owns — the zoo gallery, the sanctuary stage, the sell list — and
 * on the Lucky Box reveal, which is the only place one can be obtained.
 *
 * The tier treatment underneath is unchanged: a shiny Rare is still framed,
 * fielded and chipped as a Rare, with this on top. That is the whole point
 * of it being a flag rather than a fifth tier.
 *
 * The wash tints the *field*, painted behind the artwork. On a full card the
 * art itself also goes holographic (`holo-art` + `HoloShine`) — a reversal of
 * the handoff's original "never recolour the art" rule, at its author's call.
 * Small surfaces (rows, tiles) keep the art's true colours.
 */

/**
 * Wraps a card in the iridescent frame — a 2px gradient border drawn as
 * padding, since a CSS border cannot hold a gradient. The child supplies
 * its own background, so it must not also carry a border of its own or the
 * gradient is hidden behind it. The default radius is `rounded-card-lg` plus
 * the 2px frame, so a `rounded-card-lg` child's corner sits flush inside;
 * pass `className` with a matching radius for any other child.
 */
export function ShinyFrame({
  shiny,
  className,
  children,
}: {
  shiny: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (!shiny) return <>{children}</>;

  return (
    <div
      className={cn(
        "bg-(image:--gradient-shiny-frame) shadow-shiny rounded-[calc(var(--radius-card-lg)+2px)] p-[2px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The holographic layers, painted straight after an image carrying
 * `holo-art`: rainbow bands (`color` blend) and a white glint (soft-light),
 * both masked to the image's own silhouette so they land on the art alone,
 * and drifting together. They fill their positioned parent by default; pass
 * `style` when the image is offset inside it (`ArtThumb`'s crop), so the
 * mask lines up with the art.
 */
export function HoloShine({
  src,
  style,
}: {
  src: string;
  style?: React.CSSProperties;
}) {
  const layer: React.CSSProperties = {
    maskImage: `url("${src}")`,
    maskSize: "contain",
    maskPosition: "center",
    maskRepeat: "no-repeat",
    backgroundSize: "200% 200%",
    ...style,
  };

  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-holo-drift bg-(image:--gradient-holo) mix-blend-color"
        style={layer}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-holo-drift bg-(image:--gradient-holo-glint) mix-blend-soft-light"
        style={layer}
      />
    </>
  );
}

/**
 * The wash, for `ItemWell`'s `fieldFx` slot — which paints behind the art,
 * which is exactly where this belongs.
 */
export const SHINY_WASH = "var(--gradient-shiny-wash)";

/**
 * The `✦ Shiny` pill, sitting immediately after the tier chip. `label`
 * swaps the word for #289's happiness bonus, which wears the same pill.
 * `iconOnly` (#293) drops the word visually for rows too tight to fit it.
 */
export function ShinyPill({
  className,
  label = "Shiny",
  iconOnly = false,
}: {
  className?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  return (
    <span
      className={cn(
        "bg-(image:--gradient-shiny-frame) flex flex-none items-center text-white",
        iconOnly
          ? // A round badge, 23px to match `RarityChip size="row"` beside it.
            "size-[23px] justify-center rounded-full"
          : "gap-[3px] rounded-[6px] px-[6px] py-[2px] text-[9.5px] font-extrabold tracking-[.5px] uppercase",
        className,
      )}
    >
      <Sparkles
        size={iconOnly ? 12 : 9}
        strokeWidth={iconOnly ? 2.4 : 2.8}
        aria-hidden
      />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}

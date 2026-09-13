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
 * **The art is never recoloured** (UPDATE-01 §7 rule 3). The wash tints the
 * *field*, painted behind the artwork, so an animal keeps its true colours;
 * there is no filter and no hue-rotate anywhere in here.
 */

/**
 * Wraps a card in the iridescent frame — a 2px gradient border drawn as
 * padding, since a CSS border cannot hold a gradient. The child supplies
 * its own background, so it must not also carry a border of its own or the
 * gradient is hidden behind it.
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
        "bg-(image:--gradient-shiny-frame) shadow-shiny rounded-[calc(var(--radius-card)+2px)] p-[2px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The wash, for `ItemWell`'s `fieldFx` slot — which paints behind the art,
 * which is exactly where this belongs.
 */
export const SHINY_WASH = "var(--gradient-shiny-wash)";

/** The `✦ Shiny` pill, sitting immediately after the tier chip. */
export function ShinyPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-(image:--gradient-shiny-frame) flex flex-none items-center gap-[3px] rounded-[6px] px-[6px] py-[2px] text-[9.5px] font-extrabold tracking-[.5px] text-white uppercase",
        className,
      )}
    >
      <Sparkles size={9} strokeWidth={2.8} aria-hidden />
      Shiny
    </span>
  );
}

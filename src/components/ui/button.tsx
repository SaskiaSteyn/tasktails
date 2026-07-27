import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Buttons per the style guide's BUTTONS card.
 *
 * Hover darkens the fill ~10% and lifts 1px with a larger shadow; pressed darkens
 * further and sinks 1px with a smaller shadow; 120ms ease on everything.
 */

export type ButtonVariant =
  | "primary"
  | "positive"
  | "secondary"
  | "destructive"
  | "oauth";
export type ButtonSize = "full" | "inline" | "dialog";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Buttons span their container by default — that is how every button in the
   * designs is drawn. Opt out for one sitting inline beside other content, where
   * a `w-auto` class could not win against the base `w-full`.
   */
  fullWidth?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 transition-all duration-120 ease-out disabled:cursor-not-allowed disabled:shadow-none";

const sizes: Record<ButtonSize, string> = {
  // Primary CTA — 48px tall, radius 13, Fredoka 600 16px.
  full: "h-12 rounded-btn font-display text-[16px] font-semibold",
  // In-flow actions — 44px tall, radius 12, Fredoka 600 14px.
  inline: "h-11 rounded-input font-display text-[14px] font-semibold",
  // Modal actions — 46px tall, radius 12 (handoff addendum §2).
  dialog: "h-[46px] rounded-input font-display text-[15px] font-semibold",
};

// Filled buttons follow the style guide exactly: accent fill, white label,
// hover/press darken the fill. An ink label was tried for contrast (4.84:1 on
// terracotta vs white's 2.94:1) and rejected — white is the intended look.
// White-on-terracotta and white-on-sage are accepted AA exceptions; see the
// audit block at the top of globals.css.
const variants: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-terracotta text-white shadow-btn",
    "hover:not-disabled:bg-terracotta-hover hover:not-disabled:shadow-btn-hover hover:not-disabled:-translate-y-px",
    "active:not-disabled:bg-terracotta-press active:not-disabled:shadow-btn-press active:not-disabled:translate-y-px",
    "disabled:bg-terracotta-disabled",
  ),
  positive: cn(
    "bg-sage text-white shadow-btn-sage",
    "hover:not-disabled:bg-sage-hover hover:not-disabled:shadow-btn-sage-hover hover:not-disabled:-translate-y-px",
    "active:not-disabled:bg-sage-press active:not-disabled:translate-y-px",
    "disabled:bg-sage/40",
  ),
  // One of the two sanctioned uses of urgency red (the other is Group B's
  // false-urgency stimuli): irreversible actions, per the addendum's confirm
  // dialog. Never reach for this variant to mean "important".
  destructive: cn(
    "bg-urgency text-white shadow-btn-danger",
    "hover:not-disabled:bg-urgency-text hover:not-disabled:-translate-y-px",
    "active:not-disabled:translate-y-px",
    "disabled:bg-urgency/40",
  ),
  // White fill + 1.5px terracotta stroke and terracotta text — never a grey fill.
  secondary: cn(
    "border-[1.5px] border-terracotta bg-surface text-terracotta",
    "hover:not-disabled:border-terracotta-hover hover:not-disabled:bg-terracotta-tint hover:not-disabled:text-terracotta-hover",
    "active:not-disabled:bg-terracotta-tint-press",
    "disabled:border-terracotta-disabled disabled:text-terracotta-disabled",
  ),
  // OAuth: neutral white button with the input border, Nunito 800 13px.
  oauth: cn(
    "border border-border-input bg-surface text-ink",
    "hover:not-disabled:bg-warm hover:not-disabled:border-checkbox",
    "active:not-disabled:bg-input",
    "disabled:text-ink-disabled",
  ),
};

export function Button({
  variant = "primary",
  size = "full",
  fullWidth = true,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const isOauth = variant === "oauth";

  return (
    <button
      type={type}
      className={cn(
        base,
        fullWidth ? "w-full" : "flex-none",
        // The OAuth button carries its own type ramp (Nunito 800 13px, 44px tall).
        isOauth
          ? "h-11 rounded-input text-[13px] font-extrabold"
          : sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

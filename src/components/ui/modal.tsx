"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * The shared confirm dialog from the handoff addendum (§2 destructive, §3
 * non-destructive). One component, two intents: only the icon tint and the
 * confirm button change.
 *
 * Built on the native `<dialog>` so focus trapping, the inert background and
 * Escape-to-close come from the platform rather than a hand-rolled focus
 * manager. Escape and a scrim tap both mean cancel.
 */

export type ModalIconTint = "terracotta" | "violet" | "destructive";

const tints: Record<ModalIconTint, string> = {
  terracotta: "bg-terracotta-tint text-terracotta",
  violet: "bg-violet-tint text-violet",
  destructive: "bg-terracotta-tint text-urgency",
};

export function Modal({
  open,
  icon: Icon,
  iconTint = "terracotta",
  title,
  body,
  confirmLabel,
  confirmVariant = "primary",
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  icon: LucideIcon;
  iconTint?: ModalIconTint;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "destructive";
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // Generated, not hardcoded: two modals mounted at once would otherwise both
  // claim id="modal-title", and an aria-labelledby that resolves to a duplicate
  // id is undefined behaviour (INF-14).
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      // The dialog element itself fills the viewport under the card, so a click
      // that lands on it rather than on the card is a scrim tap.
      onClick={(event) => {
        if (event.target === ref.current) onCancel();
      }}
      aria-labelledby={titleId}
      // The body carries the actual consequence of confirming, so it is part of
      // the dialog's announcement rather than something to go hunting for.
      aria-describedby={bodyId}
      className={cn(
        "m-auto w-[calc(100%-2.5rem)] max-w-[300px] bg-transparent p-0 text-ink",
        "backdrop:bg-scrim",
      )}
    >
      <div className="rounded-modal bg-surface px-[22px] pt-6 pb-5 shadow-modal">
        <div
          className={cn(
            "mx-auto mb-[14px] flex size-14 items-center justify-center rounded-full",
            tints[iconTint],
          )}
        >
          <Icon size={26} strokeWidth={2.2} aria-hidden />
        </div>

        <h2
          id={titleId}
          className="text-center font-display text-[20px] font-semibold"
        >
          {title}
        </h2>

        <p
          id={bodyId}
          className="mt-2 text-center text-[13px] leading-[1.5] text-ink-soft"
        >
          {body}
        </p>

        {/* Always stacked, confirm first — addendum §"Modal notes". */}
        <div className="mt-5 flex flex-col gap-[9px]">
          <Button size="dialog" variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button size="dialog" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

"use client";

import { Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Modal } from "@/components/ui/modal";

/**
 * The "are you sure" for selling one owned thing, plus the `POST
 * /api/inventory/[id]/sell` it guards — shared by every surface that offers
 * to sell: the long-press menu on `/zoo` and the customize screen
 * (`OwnedItemActions`) and the store card's own Sell button
 * (`StoreItemCard`). One copy of the wording, one copy of the request, so
 * the three can't drift.
 *
 * `/profile/sell`'s list keeps its own inline version — it has a per-row
 * pending/error state tied to a list it also mutates locally, which this
 * doesn't model.
 *
 * The error lands inside the dialog rather than behind it: the dialog is
 * modal, so a message on the page underneath would be both unreachable and
 * unannounced until it closed.
 */
export function SellConfirm({
  open,
  id,
  name,
  sellValue,
  onSold,
  onClose,
}: {
  open: boolean;
  /** An `InventoryItem` id or a `Pet` id — the sell route resolves either. */
  id: string;
  name: string;
  sellValue: number;
  /** Fired after a successful sell, before `router.refresh()` — for callers holding local state about the item that just vanished. */
  onSold?: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selling, setSelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSell() {
    if (selling) return;
    setSelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/inventory/${id}/sell`, { method: "POST" });
      if (!response.ok) {
        setError(`Couldn't sell ${name}. Try again.`);
        return;
      }
      onSold?.();
      onClose();
      router.refresh();
    } catch {
      setError("Can't reach TaskTails. Check your connection and try again.");
    } finally {
      setSelling(false);
    }
  }

  return (
    <Modal
      open={open}
      icon={Coins}
      iconTint="destructive"
      title={`Sell ${name}?`}
      body={
        <>
          {/* One expression, not text around `{sellValue}` — JSX drops the
              space between an expression and text that wraps to the next
              line, which is how this shipped reading "28coins". */}
          {`You'll get ${sellValue.toLocaleString("en-US")} coins. This can't be undone — it's gone from your account for good.`}
          {error ? (
            <span role="alert" className="mt-2 block font-bold text-urgency-text">
              {error}
            </span>
          ) : null}
        </>
      }
      confirmLabel={selling ? "Selling…" : "Sell"}
      confirmVariant="destructive"
      cancelLabel="Keep it"
      onConfirm={() => void handleSell()}
      onCancel={() => {
        setError(null);
        onClose();
      }}
    />
  );
}

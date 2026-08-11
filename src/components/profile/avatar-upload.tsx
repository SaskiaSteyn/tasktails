"use client";

import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * PRO-02 — the profile avatar, user-uploadable (`design_handoff/README.md`'s
 * "image drop; default is an upload placeholder"). Tapping it opens the
 * device's file picker; there's no separate edit mode to enter first, since
 * the design draws only the one state per avatar.
 *
 * `router.refresh()` on success rather than local state: the avatar is read
 * from the `User` row on the server (`ProfileHeader`'s prop), and this way
 * there's exactly one source of truth for it rather than a client copy that
 * could drift.
 */
export function AvatarUpload({ avatarUrl }: { avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setPending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Couldn't upload that image. Try again.");
        return;
      }

      router.refresh();
    } catch {
      setError("Couldn't upload that image. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex-none">
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
        className={cn(
          "block size-14 flex-none overflow-hidden rounded-full transition-opacity duration-120 ease-out",
          pending && "opacity-60",
        )}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-14 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-checkbox bg-input text-ink-faint"
          >
            <ImagePlus size={20} strokeWidth={2} />
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      {error && (
        <p
          role="alert"
          className="mt-1 max-w-[110px] text-[9.5px] leading-[1.3] text-urgency-text"
        >
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { cn } from "@/lib/cn";

/**
 * PRO-02 — the profile avatar, user-uploadable (`design_handoff/README.md`'s
 * "image drop; default is an upload placeholder"). Tapping it opens the
 * device's file picker; there's no separate edit mode to enter first, since
 * the design draws only the one state per avatar.
 *
 * Empty state is `MonogramAvatar` (LEAD-07's letter-avatar primitive, until
 * now only used on the leaderboard) rather than the earlier dashed-border
 * `ImagePlus` placeholder — same "temp picture until you set a real one"
 * pattern most apps use, at the user's request. Also picks up that
 * component's own handling of PRO-03's base64 data URLs for free once a
 * photo *is* set, replacing this file's own plain `<img>`.
 *
 * `router.refresh()` on success rather than local state: the avatar is read
 * from the `User` row on the server (`ProfileHeader`'s prop), and this way
 * there's exactly one source of truth for it rather than a client copy that
 * could drift.
 */
export function AvatarUpload({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
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
        <MonogramAvatar name={name} avatarUrl={avatarUrl} size={56} />
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

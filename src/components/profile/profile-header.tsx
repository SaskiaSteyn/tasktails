import { AvatarUpload } from "@/components/profile/avatar-upload";

/**
 * PRO-01 — profile banner: avatar, name, email, LEVEL badge.
 *
 * The design's frame also draws a "STUDY GROUP B" chip beside the level badge.
 * It is deliberately left out: showing a participant their own arm assignment
 * would break the blinding NFR-TASK-3 requires, so AUTH-04 already keeps the
 * group off the wire to the client entirely — a chip here would have nothing
 * to read anyway. Confirmed with the project owner rather than assumed.
 *
 * The avatar itself is `AvatarUpload` (PRO-02) — a client component, since
 * uploading needs interactivity this server component can't provide.
 */
export function ProfileHeader({
  name,
  email,
  level,
  avatarUrl,
}: {
  name: string;
  email: string;
  level: number;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-[13px]">
      <AvatarUpload name={name} avatarUrl={avatarUrl} />

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[19px] leading-[1.1] font-semibold">
          {name}
        </h1>
        <p className="truncate text-[11.5px] text-ink-soft">{email}</p>
        <div className="mt-[6px] flex gap-[5px]">
          <span className="rounded-pill bg-violet-tint px-2 py-[2px] text-[9.5px] font-extrabold text-violet-text">
            LEVEL {level}
          </span>
        </div>
      </div>
    </div>
  );
}

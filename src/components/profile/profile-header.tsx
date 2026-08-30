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
 *
 * `as` exists because INF-22 mounts this twice on `/profile`: once in the
 * phone header (where the name is the page's `h1`) and once in the body at
 * desktop widths, where the universal header's "Profile" is already the `h1`
 * and a second one would break the document outline (INF-14). Exactly one of
 * the two is ever in the accessibility tree, but they need different levels.
 * Same escape hatch, same reason, as `AppHeader`'s `titleAs`.
 */
export function ProfileHeader({
  name,
  email,
  level,
  studyId,
  avatarUrl,
  as: Heading = "h1",
}: {
  name: string;
  email: string;
  level: number;
  studyId: string;
  avatarUrl: string | null;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-[13px]">
      <AvatarUpload name={name} avatarUrl={avatarUrl} />

      <div className="min-w-0 flex-1">
        <Heading className="truncate font-display text-[19px] leading-[1.1] font-semibold">
          {name}
        </Heading>
        <p className="truncate text-[11.5px] text-ink-soft">{email}</p>
        <div className="mt-[6px] flex gap-[5px]">
          <span className="rounded-pill bg-violet-tint px-2 py-[2px] text-[9.5px] font-extrabold text-violet-text">
            LEVEL {level}
          </span>
          {/* #189 — the participant's own anonymous study code, in the slot the
              design drew the (deliberately omitted) study-group chip in. Neutral
              tones on purpose: it must not read as a group marker. */}
          <span className="rounded-pill border border-border-track px-2 py-[2px] font-mono text-[9.5px] font-medium text-ink-soft">
            <span className="font-extrabold">ID:</span> {studyId}
          </span>
        </div>
      </div>
    </div>
  );
}

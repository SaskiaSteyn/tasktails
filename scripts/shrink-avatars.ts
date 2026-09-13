/**
 * Re-encodes every stored avatar larger than `MAX_AVATAR_BYTES` down to the
 * same `AVATAR_PX` JPEG `AvatarUpload` now produces. Run once per database:
 *
 *   npx tsx --env-file=.env.local scripts/shrink-avatars.ts
 *
 * Uploads used to be stored as sent (up to 3 MB), and avatars are inlined into
 * every leaderboard read, so one phone photo slowed Profile and the leaderboard
 * for every participant. New uploads are downscaled in the browser; this fixes
 * the rows written before that. Safe to re-run — small rows are skipped.
 *
 * ponytail: participants only (`listParticipants`), since only they appear on
 * the leaderboard. An admin's oversized avatar costs just that admin.
 */
import sharp from "sharp";

import { listParticipants, setAvatar } from "@/lib/users";
import { AVATAR_PX, MAX_AVATAR_BYTES } from "@/lib/validation/avatar";

async function main() {
  for (const { email, avatarUrl } of await listParticipants()) {
    if (!avatarUrl || avatarUrl.length <= MAX_AVATAR_BYTES) continue;

    const input = Buffer.from(avatarUrl.slice(avatarUrl.indexOf(",") + 1), "base64");
    const output = await sharp(input)
      .rotate()
      .resize(AVATAR_PX, AVATAR_PX, { fit: "cover" })
      .flatten({ background: "#fff" })
      .jpeg({ quality: 85 })
      .toBuffer();

    await setAvatar(email, `data:image/jpeg;base64,${output.toString("base64")}`);
    console.log(`${email}: ${avatarUrl.length} → ${output.length * 4 / 3 | 0} chars`);
  }
}

main().then(() => process.exit(0));

/**
 * PRO-03's upload rules.
 *
 * The row is inlined as a data URL wherever an avatar is drawn — every
 * leaderboard row, the rail, the profile header — so its size is paid on page
 * loads, not just once. `AvatarUpload` downscales to `AVATAR_PX` square before
 * sending (a few tens of KB); the cap is the server's backstop against a
 * client that doesn't. It used to be 3 MB, and one 1.6 MB photo made the
 * leaderboard several megabytes for everyone. Storage is
 * the `User.avatarUrl` text column, not a file on disk: the deployed container
 * (INF-15) has no volume outside the database, so anything written to its
 * filesystem is gone on the next `docker compose up --build`.
 *
 * Magic bytes are checked rather than trusting the browser's declared
 * `file.type` — cheap to do and means what lands in the column is always a
 * real image of a type an `<img>` tag can render, not just something a client
 * claimed was one.
 */
export const MAX_AVATAR_BYTES = 256 * 1024;

/** Stored edge length — 3× the largest drawn avatar (the 74px podium winner). */
export const AVATAR_PX = 256;

const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
];

/** Detects PNG/JPEG/GIF by magic bytes, and WEBP by its RIFF....WEBP header. */
export function sniffImageType(bytes: Uint8Array): string | null {
  for (const { mime, bytes: signature } of SIGNATURES) {
    if (signature.every((byte, index) => bytes[index] === byte)) return mime;
  }

  const isRiff =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  const isWebp =
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (isRiff && isWebp) return "image/webp";

  return null;
}

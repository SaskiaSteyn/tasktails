import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * LEAD-16 — dev-only fixtures for the leaderboard states that real data can't
 * reach.
 *
 * Two of the leaderboard's branches are unreachable on any populated database:
 * the empty board (LEAD-14) needs *nobody* to have earned anything, and the
 * ellipsis (LEAD-12) needs you ranked far below the visible rows. Neither can
 * be produced by using the app normally, so they get a fixture script instead.
 *
 * **This never runs as part of `prisma db seed`.** `prisma/seed.ts` is the real
 * seed — catalogue and achievements, things the app genuinely needs. This one
 * mutates participant accounts and is invoked by hand:
 *
 *     npx tsx --env-file=.env.local prisma/seed-leaderboard.ts <command>
 *
 *     empty     back up every participant's score, then zero them all
 *     restore   put the backed-up scores back
 *     populate  add demo participants with varied scores
 *     clean     delete the demo participants `populate` created
 *     status    print the board without changing anything
 *
 * ## Two safety properties, both deliberate
 *
 * **`empty` is reversible.** It writes every participant's current
 * `lifetimeCoinsEarned` to a backup file *before* touching anything, and
 * refuses to overwrite an existing backup — so running it twice can't lose the
 * original values behind a second snapshot of zeroes. `restore` puts them back
 * and deletes the file.
 *
 * **`populate`'s accounts cannot be signed into and are labelled.** They carry
 * `passwordHash: null` and a `@seed.invalid` address (RFC 2606 reserved, so it
 * can never route anywhere real). That matters beyond tidiness: seeded rows
 * would otherwise sit in ADM's participant tables and exports as if they were
 * study data. `clean` removes exactly the accounts on that domain and nothing
 * else. **Anything analysing participants must exclude that domain, or be run
 * after `clean`.**
 */

const SEED_DOMAIN = "seed.invalid";
const BACKUP = join(process.cwd(), ".leaderboard-score-backup.json");

/** Never on a real deployment — this rewrites participant scores. */
function assertNotProduction(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "seed-leaderboard is a development fixture and refuses to run with NODE_ENV=production.",
    );
  }
}

type Backup = { savedAt: string; scores: Record<string, number> };

async function status(): Promise<void> {
  const rows = await prisma.user.findMany({
    where: { role: UserRole.PARTICIPANT },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, email: true, economy: { select: { lifetimeCoinsEarned: true } } },
  });

  const ranked = [...rows].sort(
    (a, b) => (b.economy?.lifetimeCoinsEarned ?? 0) - (a.economy?.lifetimeCoinsEarned ?? 0),
  );

  console.log(`${rows.length} participants (admins excluded):`);
  for (const r of ranked) {
    const seeded = r.email.endsWith(`@${SEED_DOMAIN}`) ? "  [seeded]" : "";
    console.log(
      `  ${String(r.economy?.lifetimeCoinsEarned ?? 0).padStart(6)}  ${(r.username ?? "(no handle)").padEnd(16)}${seeded}`,
    );
  }
  console.log(`\nbackup file: ${existsSync(BACKUP) ? BACKUP : "(none)"}`);
}

async function empty(): Promise<void> {
  if (existsSync(BACKUP)) {
    throw new Error(
      `A backup already exists at ${BACKUP}.\n` +
        "Run `restore` first — overwriting it would replace the real scores with a snapshot of zeroes.",
    );
  }

  const rows = await prisma.userEconomy.findMany({
    select: { userId: true, lifetimeCoinsEarned: true },
  });

  const backup: Backup = {
    savedAt: new Date().toISOString(),
    scores: Object.fromEntries(rows.map((r) => [r.userId, r.lifetimeCoinsEarned])),
  };
  // Written and flushed before the first update, so an interrupted run still
  // leaves something to restore from.
  writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
  console.log(`Backed up ${rows.length} scores to ${BACKUP}`);

  const { count } = await prisma.userEconomy.updateMany({
    data: { lifetimeCoinsEarned: 0 },
  });
  console.log(`Zeroed ${count} economy rows. The board is now empty.`);
  console.log("Restore with: npx tsx --env-file=.env.local prisma/seed-leaderboard.ts restore");
}

async function restore(): Promise<void> {
  if (!existsSync(BACKUP)) throw new Error(`No backup at ${BACKUP} — nothing to restore.`);

  const backup = JSON.parse(readFileSync(BACKUP, "utf8")) as Backup;
  const entries = Object.entries(backup.scores);

  let restored = 0;
  for (const [userId, score] of entries) {
    // updateMany rather than update: an account deleted since the backup should
    // be skipped, not throw and abandon the rest of the restore.
    const { count } = await prisma.userEconomy.updateMany({
      where: { userId },
      data: { lifetimeCoinsEarned: score },
    });
    restored += count;
  }

  console.log(`Restored ${restored} of ${entries.length} scores (saved ${backup.savedAt}).`);
  unlinkSync(BACKUP);
  console.log("Backup file removed.");
}

/** Enough people, spread widely enough, to push a real account below the fold. */
const DEMO = [
  { username: "kai", score: 3540 },
  { username: "aria", score: 3120 },
  { username: "mila", score: 2880 },
  { username: "theo", score: 2640 },
  { username: "sana", score: 2410 },
  { username: "rin", score: 2180 },
  { username: "juno", score: 1960 },
  { username: "otto", score: 1740 },
  { username: "vera", score: 1520 },
  { username: "milo", score: 1310 },
];

async function populate(): Promise<void> {
  for (const { username, score } of DEMO) {
    const email = `${username}@${SEED_DOMAIN}`;
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.userEconomy.updateMany({
        where: { userId: existing.id },
        data: { lifetimeCoinsEarned: score },
      });
      continue;
    }

    await prisma.user.create({
      data: {
        email,
        username,
        // No password hash: these accounts exist to be ranked, not signed into.
        passwordHash: null,
        // Fixed rather than randomised — a fake account should not perturb the
        // A/B split, and these are excluded from analysis anyway.
        abGroup: "A",
        economy: { create: { lifetimeCoinsEarned: score } },
        settings: { create: {} },
      },
    });
  }
  console.log(`Seeded ${DEMO.length} demo participants on @${SEED_DOMAIN}.`);
  console.log("These are NOT study data — exclude the domain or run `clean` before analysis.");
}

async function clean(): Promise<void> {
  const { count } = await prisma.user.deleteMany({
    where: { email: { endsWith: `@${SEED_DOMAIN}` } },
  });
  console.log(`Deleted ${count} demo participants. Related rows cascade (INF-01).`);
}

const COMMANDS = { empty, restore, populate, clean, status };

async function main(): Promise<void> {
  assertNotProduction();
  const command = process.argv[2] as keyof typeof COMMANDS | undefined;

  if (!command || !(command in COMMANDS)) {
    console.error(`Usage: seed-leaderboard.ts <${Object.keys(COMMANDS).join(" | ")}>`);
    process.exitCode = 1;
    return;
  }

  await COMMANDS[command]();
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

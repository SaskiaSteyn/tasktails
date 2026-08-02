import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

import { AbGroup, type User, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Every read and write of an account (INF-01, AUTH-04).
 *
 * This module replaced the in-memory store that stood in for it while the auth
 * screens were built. Storage access stays behind this API — callers never touch
 * `prisma.user` directly — so schema changes land in one file.
 */

/** A/B study group — assigned once at account creation, permanent (AUTH-5). */
export type StudyGroup = AbGroup;

/** What the whole app means by "a user". */
export type { User };

const normaliseEmail = (email: string) => email.trim().toLowerCase();
const normaliseUsername = (username: string) => username.trim().toLowerCase();

/**
 * Random, unbiased A/B assignment. NFR-TASK-3 requires this to be
 * server-enforced — it is only ever called from server-side code.
 */
function assignStudyGroup(): AbGroup {
  return randomInt(2) === 0 ? AbGroup.A : AbGroup.B;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, derived] = stored.split(":");
  if (!salt || !derived) return false;

  const expected = Buffer.from(derived, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email: normaliseEmail(email) } });
}

/** Session callbacks carry `user.id`, not `user.email` — this is that lookup. */
export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

/** What ADM-02/03/04/06's tables render one row of. */
export type ParticipantSummary = Pick<
  User,
  "id" | "username" | "email" | "displayName" | "abGroup" | "createdAt"
>;

/**
 * Every non-admin account (ADM-06) — the researcher's own `ADMIN` row isn't
 * a study participant and has no A/B group meaning, so it's excluded rather
 * than showing up as a stray row in the comparison tables.
 *
 * Ordered by `createdAt` so "Participant #07" style labelling (the design's
 * own convention) is stable across reads.
 */
export async function listParticipants(): Promise<ParticipantSummary[]> {
  return prisma.user.findMany({
    where: { role: UserRole.PARTICIPANT },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      abGroup: true,
      createdAt: true,
    },
  });
}

/** Usernames are unique — the schema's unique index is what enforces it. */
export async function isUsernameAvailable(
  username: string,
  exceptEmail?: string,
): Promise<boolean> {
  const owner = await prisma.user.findUnique({
    where: { username: normaliseUsername(username) },
    select: { email: true },
  });

  if (!owner) return true;
  return exceptEmail ? owner.email === normaliseEmail(exceptEmail) : false;
}

export class UsernameTakenError extends Error {
  constructor() {
    super("That username is taken.");
    this.name = "UsernameTakenError";
  }
}

/**
 * Sets the handle on an existing account — the onboarding username step and the
 * profile editor both land here. Throws {@link UsernameTakenError} if someone
 * claimed it between the availability check and the save; the unique constraint
 * is what catches the race, not the check above it.
 */
export async function setUsername(
  email: string,
  username: string,
): Promise<User | undefined> {
  try {
    return await prisma.user.update({
      where: { email: normaliseEmail(email) },
      data: { username: normaliseUsername(username) },
    });
  } catch (error) {
    if (isUniqueViolation(error, "username")) throw new UsernameTakenError();
    if (isRecordNotFound(error)) return undefined;
    throw error;
  }
}

/**
 * Sets the uploaded profile photo (PRO-03) — a data URL, not a file path; see
 * `src/lib/validation/avatar.ts` for why. Returns `undefined` rather than
 * throwing when the account is gone, matching {@link setUsername}.
 */
export async function setAvatar(
  email: string,
  avatarUrl: string,
): Promise<User | undefined> {
  try {
    return await prisma.user.update({
      where: { email: normaliseEmail(email) },
      data: { avatarUrl },
    });
  } catch (error) {
    if (isRecordNotFound(error)) return undefined;
    throw error;
  }
}

/** Strips a candidate down to the allowed alphabet: a–z, 0–9 and underscore. */
export function slugifyUsername(value: string): string {
  return normaliseUsername(value)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** The material a handle is built from — a name if we have one, else the email. */
function usernameSeed(user: Pick<User, "displayName" | "email">): string {
  const seed =
    slugifyUsername(user.displayName ?? "") ||
    slugifyUsername(user.email.split("@")[0]);
  return (seed || "friend").slice(0, 16);
}

/** Handles already claimed that start with `base`, so a free one can be picked. */
async function takenWithPrefix(
  base: string,
  exceptEmail: string,
): Promise<Set<string>> {
  const rows = await prisma.user.findMany({
    where: { username: { startsWith: base }, email: { not: exceptEmail } },
    select: { username: true },
  });

  return new Set(
    rows.map((row) => row.username).filter((name): name is string => !!name),
  );
}

/**
 * A free handle built from whatever we know about someone. Digits are appended
 * until it is free, so this always returns something usable (what Skip hands
 * out, and what seeds the suggestion chips).
 */
export async function generateUsername(
  user: Pick<User, "displayName" | "email">,
): Promise<string> {
  const base = usernameSeed(user);
  const taken = await takenWithPrefix(base, normaliseEmail(user.email));

  if (!taken.has(base)) return base;

  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = `${base}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Vanishingly unlikely; a random tail is still better than throwing.
  return `${base}${randomBytes(2).toString("hex")}`;
}

/**
 * A few free handles to offer as chips, seeded from the same material.
 *
 * Nothing here may vary by study group: a suggestion that differed between arms
 * would hand participants a way to work out which one they are in (NFR-TASK-3).
 */
export async function suggestUsernames(
  user: Pick<User, "displayName" | "email">,
  count = 3,
): Promise<string[]> {
  const base = usernameSeed(user);
  const taken = await takenWithPrefix(base, normaliseEmail(user.email));

  const candidates = [
    base,
    `${base}_tt`,
    ...Array.from({ length: 20 }, (_, index) => `${base}${index + 1}`),
  ];

  const suggestions: string[] = [];
  for (const candidate of candidates) {
    if (suggestions.length >= count) break;

    const trimmed = candidate.slice(0, 20);
    if (
      trimmed.length >= 3 &&
      !suggestions.includes(trimmed) &&
      !taken.has(trimmed)
    ) {
      suggestions.push(trimmed);
    }
  }

  return suggestions;
}

export class EmailInUseError extends Error {
  constructor() {
    super("That email is already registered.");
    this.name = "EmailInUseError";
  }
}

/**
 * Creates a credentials account (AUTH-04) — hashes the password, assigns the
 * permanent study group and initialises the economy and settings records in one
 * transaction, so an account can never exist without the rows the rest of the
 * app assumes are there.
 *
 * Throws {@link EmailInUseError} on a duplicate.
 */
export async function createUser(
  email: string,
  password: string,
): Promise<User> {
  try {
    return await prisma.user.create({
      data: {
        email: normaliseEmail(email),
        passwordHash: hashPassword(password),
        abGroup: assignStudyGroup(),
        economy: { create: {} },
        // Empty on purpose — every default lives in the schema (INF-18), so the
        // row matches the Settings frame without repeating the values here.
        settings: { create: {} },
      },
    });
  } catch (error) {
    if (isUniqueViolation(error, "email")) throw new EmailInUseError();
    throw error;
  }
}

/**
 * Finds or creates the account behind a Google sign-in. A first-time Google user
 * gets a study group and an economy record here, so OAuth and credentials
 * accounts are indistinguishable downstream.
 */
export async function upsertOAuthUser(
  email: string,
  name?: string | null,
): Promise<User> {
  const key = normaliseEmail(email);

  return prisma.user.upsert({
    where: { email: key },
    // Backfill for an account that predates its provider handing us a name;
    // never overwrite one we already have.
    update: name ? { displayName: { set: name } } : {},
    create: {
      email: key,
      displayName: name ?? null,
      abGroup: assignStudyGroup(),
      economy: { create: {} },
      settings: { create: {} },
    },
  });
}

/**
 * What the app greets someone by — their handle, never the email address.
 *
 * Note this is not `user.displayName`, which is the full name the OAuth provider
 * gave us and is only ever used to seed handle suggestions.
 */
export function displayNameFor(user: Pick<User, "username" | "email">): string {
  return user.username ?? displayNameFromEmail(user.email);
}

/** "Saskia Steyn" → "Saskia". Null when there is no name to work from. */
export function firstName(name?: string | null): string | null {
  return name?.trim().split(/\s+/)[0] || null;
}

/** Stand-in greeting for an account with no handle yet. */
export function displayNameFromEmail(email: string): string {
  // `saskia.steyn+study@…` → "saskia". Only the separators people actually put
  // between name parts, so a handle like `saskiasteyn101` is left intact rather
  // than guessed at.
  return email.split("@")[0].split(/[._+-]/)[0];
}

/** Returns the user when the password matches, otherwise null. */
export async function authenticate(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

export class IncorrectPasswordError extends Error {
  constructor() {
    super("That password isn't right.");
    this.name = "IncorrectPasswordError";
  }
}

/**
 * PRO-12 — verifies the current password and stores the new hash.
 *
 * Throws {@link IncorrectPasswordError} both when the given current password
 * is wrong and when the account has no password at all (Google-only,
 * `passwordHash` null) — there is nothing to "change" for the latter, and
 * failing the same way as a wrong password avoids a second error case the
 * form would have to explain differently for no real benefit.
 *
 * Returns `undefined` when the account itself is gone, matching
 * `setUsername`/`setAvatar`.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<User | undefined> {
  const user = await findUserById(userId);
  if (!user) return undefined;

  if (!user.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
    throw new IncorrectPasswordError();
  }

  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });
}

/**
 * Prisma's known-request errors are not exported as classes from the generated
 * client, so match on the shape instead: P2002 is a unique-constraint violation
 * and P2025 is "record not found".
 */
function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isUniqueViolation(error: unknown, field: string): boolean {
  if (prismaErrorCode(error) !== "P2002") return false;

  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  // `target` is the failing column list on Postgres; treat a missing one as a
  // match rather than swallowing the error as unknown.
  if (Array.isArray(target)) return target.includes(field);
  if (typeof target === "string") return target.includes(field);
  return true;
}

function isRecordNotFound(error: unknown): boolean {
  return prismaErrorCode(error) === "P2025";
}

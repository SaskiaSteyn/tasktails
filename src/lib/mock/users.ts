import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * MOCK user store — stands in for Prisma + PostgreSQL until INF-01/AUTH-04 land.
 *
 * Everything lives in a module-level Map, so it is process-local: records vanish
 * on server restart and are not shared between serverless instances. That is
 * fine for building the auth screens, and the shape of each record deliberately
 * mirrors the planned `User` + `UserEconomy` models so swapping in Prisma is a
 * matter of replacing the four functions at the bottom of this file.
 */

/** A/B study group — assigned once at account creation, permanent (AUTH-5). */
export type StudyGroup = "A" | "B";

export type MockUser = {
  id: string;
  email: string;
  /**
   * The handle chosen on the username step — unique, lowercase, no `@` stored.
   * Null only until that step is answered or skipped.
   */
  username: string | null;
  /**
   * Full profile name, when the provider gives us one. Google does; the
   * credentials sign-up form collects no name at all (the Register frame has
   * only email and password), so those accounts keep this null. Used to seed
   * username suggestions, never shown on its own.
   */
  name: string | null;
  /** `scrypt` hash as `salt:derivedKey`. Null for OAuth-only accounts. */
  passwordHash: string | null;
  group: StudyGroup;
  createdAt: Date;
  /** Mirrors the planned `UserEconomy` record (INF-10). */
  economy: {
    coins: number;
    xp: number;
    level: number;
    streak: number;
  };
};

/**
 * Held on `globalThis`, not in a module-level `const`.
 *
 * Route handlers and server components are bundled separately, so each gets its
 * own instance of this module — a plain module-level Map means the account the
 * register endpoint writes is invisible to the page that reads it. Dev HMR
 * re-evaluates modules for the same reason. One process-wide Map fixes both.
 * (The same trick a Prisma client needs in dev, for the same reason.)
 */
declare global {
  var __tasktailsMockUsers: Map<string, MockUser> | undefined;
}

const users: Map<string, MockUser> = (globalThis.__tasktailsMockUsers ??=
  new Map());

const normaliseEmail = (email: string) => email.trim().toLowerCase();

/**
 * Random, unbiased A/B assignment. NFR-TASK-3 requires this to be
 * server-enforced — it is only ever called from server-side code.
 */
function assignStudyGroup(): StudyGroup {
  return randomInt(2) === 0 ? "A" : "B";
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

/** A fresh `UserEconomy` — level 1, nothing earned yet (§3.6). */
function initialEconomy(): MockUser["economy"] {
  return { coins: 0, xp: 0, level: 1, streak: 0 };
}

export function findUserByEmail(email: string): MockUser | undefined {
  return users.get(normaliseEmail(email));
}

const normaliseUsername = (username: string) => username.trim().toLowerCase();

/**
 * Usernames are unique. A linear scan is fine against a Map this size; the
 * Prisma replacement is a unique index and a `findUnique`.
 */
export function isUsernameAvailable(username: string, exceptEmail?: string) {
  const wanted = normaliseUsername(username);
  const owner = exceptEmail ? normaliseEmail(exceptEmail) : null;

  for (const user of users.values()) {
    if (user.username === wanted && user.email !== owner) return false;
  }
  return true;
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
 * claimed it between the availability check and the save.
 */
export function setUsername(
  email: string,
  username: string,
): MockUser | undefined {
  const user = users.get(normaliseEmail(email));
  if (!user) return undefined;

  if (!isUsernameAvailable(username, email)) throw new UsernameTakenError();

  user.username = normaliseUsername(username);
  return user;
}

/** Strips a candidate down to the allowed alphabet: a–z, 0–9 and underscore. */
export function slugifyUsername(value: string): string {
  return normaliseUsername(value)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * A free handle built from whatever we know about someone — their profile name
 * if the provider gave one, otherwise the part of their email before the `@`.
 * Digits are appended until it is free, so this always returns something usable
 * (what Skip hands out, and what seeds the suggestion chips).
 */
export function generateUsername(user: MockUser): string {
  const seed =
    slugifyUsername(user.name ?? "") || slugifyUsername(user.email.split("@")[0]);
  const base = (seed || "friend").slice(0, 16);

  if (isUsernameAvailable(base, user.email)) return base;

  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = `${base}${suffix}`;
    if (isUsernameAvailable(candidate, user.email)) return candidate;
  }

  // Vanishingly unlikely; a random tail is still better than throwing.
  return `${base}${randomBytes(2).toString("hex")}`;
}

/**
 * A few free handles to offer as chips, seeded from the same material.
 *
 * Nothing here may vary by `group`: a suggestion that differed between arms
 * would hand participants a way to work out which one they are in (NFR-TASK-3).
 */
export function suggestUsernames(user: MockUser, count = 3): string[] {
  const seeds = [
    slugifyUsername(user.name ?? ""),
    slugifyUsername(user.email.split("@")[0]),
  ].filter(Boolean);

  const base = seeds[0] ?? "friend";
  const candidates = [
    ...seeds,
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
      isUsernameAvailable(trimmed, user.email)
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

/** Creates a credentials account. Throws {@link EmailInUseError} on a duplicate. */
export function createUser(email: string, password: string): MockUser {
  const key = normaliseEmail(email);
  if (users.has(key)) throw new EmailInUseError();

  const user: MockUser = {
    id: randomBytes(12).toString("hex"),
    email: key,
    username: null,
    name: null,
    passwordHash: hashPassword(password),
    group: assignStudyGroup(),
    createdAt: new Date(),
    economy: initialEconomy(),
  };

  users.set(key, user);
  return user;
}

/**
 * Finds or creates the account behind a Google sign-in. A first-time Google user
 * gets a study group here, so OAuth and credentials accounts are indistinguishable
 * downstream.
 */
export function upsertOAuthUser(email: string, name?: string | null): MockUser {
  const key = normaliseEmail(email);
  const existing = users.get(key);
  if (existing) {
    // Backfill for an account that predates its provider handing us a name.
    if (!existing.name && name) existing.name = name;
    return existing;
  }

  const user: MockUser = {
    id: randomBytes(12).toString("hex"),
    email: key,
    username: null,
    name: name ?? null,
    passwordHash: null,
    group: assignStudyGroup(),
    createdAt: new Date(),
    economy: initialEconomy(),
  };

  users.set(key, user);
  return user;
}

/**
 * What the app greets someone by — their handle, never the email address.
 *
 * Everything after the username step has one. The email fallback covers the gap
 * before it is answered (and any account created before the step existed).
 */
export function displayName(user: MockUser): string {
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
export function authenticate(email: string, password: string): MockUser | null {
  const user = findUserByEmail(email);
  if (!user?.passwordHash) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

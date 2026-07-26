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

const users = new Map<string, MockUser>();

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
export function upsertOAuthUser(email: string): MockUser {
  const key = normaliseEmail(email);
  const existing = users.get(key);
  if (existing) return existing;

  const user: MockUser = {
    id: randomBytes(12).toString("hex"),
    email: key,
    passwordHash: null,
    group: assignStudyGroup(),
    createdAt: new Date(),
    economy: initialEconomy(),
  };

  users.set(key, user);
  return user;
}

/** Returns the user when the password matches, otherwise null. */
export function authenticate(email: string, password: string): MockUser | null {
  const user = findUserByEmail(email);
  if (!user?.passwordHash) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

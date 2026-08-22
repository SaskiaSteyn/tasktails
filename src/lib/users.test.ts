import { describe, expect, it } from "vitest";

import { AbGroup, type User, UserRole } from "@/generated/prisma/client";
import { createUser, upsertOAuthUser } from "@/lib/users";
import { prismaMock } from "@/test/prisma-mock";

/**
 * AUTH-5 / NFR-TASK-3 — group assignment alternates (A, B, A, B, ...) rather
 * than being random, so the study split stays exactly even. `assignStudyGroup`
 * is private; exercised here through its two callers. The created/upserted row
 * itself is a fixture — these tests only assert what group was requested.
 */

function fixtureUser(abGroup: AbGroup): User {
  return {
    id: "user-1",
    email: "participant@example.com",
    username: null,
    displayName: null,
    avatarUrl: null,
    passwordHash: null,
    role: UserRole.PARTICIPANT,
    abGroup,
    createdAt: new Date(),
  };
}

describe("study group assignment", () => {
  it("gives the first participant Group A", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(fixtureUser(AbGroup.A));

    await createUser("first@example.com", "password123");

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: UserRole.PARTICIPANT } }),
    );
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ abGroup: AbGroup.A }) }),
    );
  });

  it("flips to Group B when the last participant was Group A", async () => {
    prismaMock.user.findFirst.mockResolvedValue(fixtureUser(AbGroup.A));
    prismaMock.user.create.mockResolvedValue(fixtureUser(AbGroup.B));

    await createUser("second@example.com", "password123");

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ abGroup: AbGroup.B }) }),
    );
  });

  it("flips back to Group A when the last participant was Group B", async () => {
    prismaMock.user.findFirst.mockResolvedValue(fixtureUser(AbGroup.B));
    prismaMock.user.create.mockResolvedValue(fixtureUser(AbGroup.A));

    await createUser("third@example.com", "password123");

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ abGroup: AbGroup.A }) }),
    );
  });

  it("keeps an existing OAuth user's group instead of reassigning it", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fixtureUser(AbGroup.B));
    prismaMock.user.upsert.mockResolvedValue(fixtureUser(AbGroup.B));

    await upsertOAuthUser("returning@example.com", "Returning User");

    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ abGroup: AbGroup.B }) }),
    );
  });

  it("alternates a first-time OAuth user off the last participant's group", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(fixtureUser(AbGroup.A));
    prismaMock.user.upsert.mockResolvedValue(fixtureUser(AbGroup.B));

    await upsertOAuthUser("new-oauth@example.com", "New User");

    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ abGroup: AbGroup.B }) }),
    );
  });
});

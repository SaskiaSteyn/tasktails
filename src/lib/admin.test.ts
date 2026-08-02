import { describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/admin";
import { type User, UserRole } from "@/generated/prisma/client";
import { prismaMock } from "@/test/prisma-mock";

/**
 * ADM-09 — `auth()` is mocked directly (session shape, not DB-backed); the
 * role lookup goes through the real `findUserById` against the mocked Prisma
 * client, same split as study-group.test.ts.
 */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth);

function userRow(role: UserRole): User {
  return { id: "user-1", role } as User;
}

describe("requireAdmin", () => {
  it("returns 401 when nobody is signed in", async () => {
    mockedAuth.mockResolvedValue(null as never);

    const result = await requireAdmin();

    expect(result).toEqual({ ok: false, status: 401, message: "Not signed in." });
  });

  it("returns 403 for a signed-in participant", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never);
    prismaMock.user.findUnique.mockResolvedValue(userRow(UserRole.PARTICIPANT));

    const result = await requireAdmin();

    expect(result).toEqual({
      ok: false,
      status: 403,
      message: "Admin role required.",
    });
  });

  it("returns ok for a signed-in admin", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never);
    prismaMock.user.findUnique.mockResolvedValue(userRow(UserRole.ADMIN));

    const result = await requireAdmin();

    expect(result).toEqual({ ok: true, userId: "user-1" });
  });
});

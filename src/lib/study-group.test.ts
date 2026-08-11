import { describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { AbGroup, type User } from "@/generated/prisma/client";
import { groupGatedData } from "@/lib/study-group";
import { prismaMock } from "@/test/prisma-mock";

/**
 * INF-17 — Group A requests return no urgency data; Group B requests are
 * not blocked. `auth()` is mocked directly (session shape, not DB-backed);
 * the abGroup lookup goes through the real `findUserByEmail` against the
 * mocked Prisma client, so this exercises `groupGatedData`'s actual query
 * path rather than stubbing it away.
 */
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockedAuth = vi.mocked(auth);

function userRow(abGroup: AbGroup): User {
  return {
    id: "user-1",
    email: "participant@example.com",
    abGroup,
  } as User;
}

describe("groupGatedData", () => {
  it("returns no urgency data for a Group A user", async () => {
    mockedAuth.mockResolvedValue({
      user: { email: "participant@example.com" },
    } as never);
    prismaMock.user.findUnique.mockResolvedValue(userRow(AbGroup.A));

    const forGroupB = vi.fn(() => ({ stock: 3 }));
    const result = await groupGatedData(forGroupB);

    expect(result).toBeNull();
    expect(forGroupB).not.toHaveBeenCalled();
  });

  it("is not blocked for a Group B user", async () => {
    mockedAuth.mockResolvedValue({
      user: { email: "participant@example.com" },
    } as never);
    prismaMock.user.findUnique.mockResolvedValue(userRow(AbGroup.B));

    const forGroupB = vi.fn(() => ({ stock: 3 }));
    const result = await groupGatedData(forGroupB);

    expect(result).toEqual({ stock: 3 });
    expect(forGroupB).toHaveBeenCalledOnce();
  });

  it("returns null when nobody is signed in", async () => {
    mockedAuth.mockResolvedValue(null as never);

    const forGroupB = vi.fn(() => ({ stock: 3 }));
    const result = await groupGatedData(forGroupB);

    expect(result).toBeNull();
    expect(forGroupB).not.toHaveBeenCalled();
  });
});

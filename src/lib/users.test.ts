import { describe, expect, it } from "vitest";

import { AbGroup, type User, UserRole } from "@/generated/prisma/client";
import { createUser } from "@/lib/users";
import { prismaMock } from "@/test/prisma-mock";

/**
 * #222 — signups alternate between the arms instead of coin-flipping, so a
 * 20-participant study splits 10/10. `assignStudyGroup()` is private; this
 * exercises it through `createUser()`, which is how it is actually reached.
 */
function counts(inA: number, inB: number) {
  prismaMock.user.count.mockImplementation((args) =>
    Promise.resolve(
      args?.where?.abGroup === AbGroup.A ? inA : inB,
    ) as never,
  );
  prismaMock.user.create.mockResolvedValue({} as User);
}

async function groupAssignedTo(inA: number, inB: number): Promise<AbGroup> {
  counts(inA, inB);
  await createUser("participant@example.com", "correct horse");
  return prismaMock.user.create.mock.calls[0][0].data.abGroup as AbGroup;
}

describe("study group assignment", () => {
  it("gives the first participant Group A", async () => {
    expect(await groupAssignedTo(0, 0)).toBe(AbGroup.A);
  });

  it("alternates — the arm that is behind gets the next participant", async () => {
    expect(await groupAssignedTo(1, 0)).toBe(AbGroup.B);
  });

  it("fills a gap left by a deleted or hand-flipped participant", async () => {
    expect(await groupAssignedTo(3, 5)).toBe(AbGroup.A);
  });

  it("counts participants only, never the researcher's admin account", async () => {
    await groupAssignedTo(0, 0);

    for (const [args] of prismaMock.user.count.mock.calls) {
      expect(args?.where?.role).toBe(UserRole.PARTICIPANT);
    }
  });
});

import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";

import { prismaMock } from "@/test/prisma-mock";

/**
 * Every test run gets this mock in place of the real Prisma client, so unit
 * tests never need a live Postgres connection. `src/lib/prisma.ts` itself is
 * never imported in the test environment.
 */
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

beforeEach(() => {
  mockReset(prismaMock);
});

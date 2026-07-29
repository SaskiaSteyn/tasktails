import { mockDeep, type DeepMockProxy } from "vitest-mock-extended";

import type { PrismaClient } from "@/generated/prisma/client";

/**
 * The mock every test gets in place of `@/lib/prisma`.
 *
 * A deep mock so `prismaMock.user.findUnique.mockResolvedValue(...)` etc. work
 * without a real Postgres connection. Reset between tests in src/test/setup.ts,
 * not here, so this file stays a plain export.
 */
export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

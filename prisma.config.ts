import { existsSync } from "node:fs";

import { defineConfig, env } from "prisma/config";

// Next.js reads .env.local automatically; the Prisma CLI only reads .env, so it
// would not see DATABASE_URL without this. Load it here rather than duplicating
// the variable across two env files.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");


/**
 * Prisma CLI configuration (INF-01).
 *
 * Prisma 7 removed `url` from `datasource db` in the schema, so migrate,
 * introspect and studio read the connection string from here instead. The
 * runtime client gets it separately, through the adapter in src/lib/prisma.ts.
 *
 * `DATABASE_URL` points at the docker-compose Postgres in local development;
 * see .env.example.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});

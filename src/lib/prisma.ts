import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * The one Prisma client (INF-01).
 *
 * Held on `globalThis` rather than a module-level `const`: dev HMR re-evaluates
 * this module on every edit, and a fresh client each time exhausts the database
 * connection pool within a few saves.
 *
 * Prisma 7 takes the connection string through a driver adapter instead of the
 * schema's datasource block — see prisma.config.ts for the CLI half of the same
 * split.
 */
declare global {
  var __tasktailsPrisma: PrismaClient | undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and start the database with `docker compose up -d`.",
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma: PrismaClient = (globalThis.__tasktailsPrisma ??=
  createClient());

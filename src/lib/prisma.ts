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

/**
 * Constructed on first use, not on import (INF-15).
 *
 * `next build` imports every route module to collect page data, so a client
 * built at module scope made `DATABASE_URL` a *build-time* requirement — the
 * Docker build could not run without being handed a connection string it has no
 * business knowing, and CI would need a database to compile. Deferring behind a
 * proxy means the variable is only needed when a query actually runs.
 *
 * The receiver passed to `Reflect.get` is the real client, not the proxy, so
 * model delegates (`prisma.user`) and methods keep their `this`.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = (globalThis.__tasktailsPrisma ??= createClient());
    return Reflect.get(client, property, client);
  },
});

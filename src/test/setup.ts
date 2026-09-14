import { act } from "react";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, vi } from "vitest";
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

/**
 * #305 — every root a test mounts is unmounted after it. A root left mounted
 * can still have React work queued on the Scheduler when the file finishes;
 * if that runs after Vitest has torn jsdom down it throws `window is not
 * defined` as an unhandled error, blamed on whichever file was last. Wrapping
 * `createRoot` here covers every component test, including ones not yet
 * written, without each one remembering to clean up.
 */
const roots = vi.hoisted(() => [] as Root[]);

vi.mock("react-dom/client", async (importOriginal) => {
  const client = await importOriginal<typeof import("react-dom/client")>();
  return {
    ...client,
    createRoot: (...args: Parameters<typeof client.createRoot>) => {
      const root = client.createRoot(...args);
      roots.push(root);
      return root;
    },
  };
});

afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
});

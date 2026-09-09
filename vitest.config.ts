import path from "node:path";

import { configDefaults, defineConfig } from "vitest/config";

/**
 * Vitest configuration — added to unblock INF-17's unit tests, which need a
 * test runner that doesn't exist yet in this repo.
 *
 * `jsdom` so component-adjacent tests (hooks, client utils) work without
 * per-file setup; server-only tests like study-group.test.ts don't need a DOM
 * and are unaffected by it. The `@/*` alias mirrors tsconfig.json's paths so
 * test files can import the same way application code does.
 *
 * `.claude/**` is excluded because agent worktrees live there, each a full
 * checkout of some other commit. Their test files were being collected and
 * run — but against *this* checkout's source, since the `@` alias below
 * resolves to the root `src` no matter which copy the test file came from.
 * An older worktree therefore failed on API it was written against and this
 * tree has since changed (`rewards.test.ts`, 2026-09-09), and one carrying
 * its own `node_modules` loaded a second React and broke SSR rendering
 * outright. Neither says anything about the code under test.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

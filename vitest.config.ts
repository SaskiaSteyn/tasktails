import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Vitest configuration — added to unblock INF-17's unit tests, which need a
 * test runner that doesn't exist yet in this repo.
 *
 * `jsdom` so component-adjacent tests (hooks, client utils) work without
 * per-file setup; server-only tests like study-group.test.ts don't need a DOM
 * and are unaffected by it. The `@/*` alias mirrors tsconfig.json's paths so
 * test files can import the same way application code does.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

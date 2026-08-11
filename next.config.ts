import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray lockfile sits above this repo and would
  // otherwise be inferred as the root.
  turbopack: { root: path.resolve(__dirname) },

  // INF-15. Emits .next/standalone with only the traced runtime files, so the
  // deployed image carries no node_modules of its own. Without this the EC2
  // image is ~1GB of dependencies for an app that needs a fraction of them.
  output: "standalone",

  // Same stray-lockfile problem as `turbopack.root` above, for the file tracer:
  // left to infer, it would walk up past this repo and drag the parent in.
  outputFileTracingRoot: path.resolve(__dirname),

  // PWA-02. `public/sw.js` would otherwise inherit whatever caching a CDN or
  // browser applies to static files by default, which for a script whose
  // entire job is deciding what else gets cached is backwards — a stale
  // cached worker can never deliver its own update. Per Next's own PWA guide.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

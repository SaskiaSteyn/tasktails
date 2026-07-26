import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray lockfile sits above this repo and would
  // otherwise be inferred as the root.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;

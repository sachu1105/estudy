import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Native addon: load from node_modules at runtime instead of bundling.
  serverExternalPackages: ["@node-rs/argon2"],
};

export default nextConfig;

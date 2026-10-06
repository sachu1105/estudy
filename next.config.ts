import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // The floating dev-tools button sits over the bottom tab bar on phones (it caught
  // taps meant for "More"). Errors still show without it.
  devIndicators: false,
  // Native addon: load from node_modules at runtime instead of bundling.
  serverExternalPackages: ["@node-rs/argon2"],
};

export default nextConfig;

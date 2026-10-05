import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { testEnv } from "./tests/integration/test-env.mts";

const serverOnlyStub = fileURLToPath(
  new URL("./tests/support/empty.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true, alias: { "server-only": serverOnlyStub } },
  test: {
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          env: testEnv,
          globalSetup: ["tests/integration/global-setup.ts"],
          // One shared database: run files one after another.
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
});

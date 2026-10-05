import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// CLAUDE.md rule 10: app -> features -> server/services -> server/repositories -> prisma.
const prismaImports = {
  group: [
    "@prisma/*",
    "@/server/db",
    "@/server/db/*",
    "**/server/db/generated/**",
  ],
  message: "Only src/server/repositories may touch prisma (CLAUDE.md rule 10).",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/app/**",
      "src/components/**",
      "src/features/**",
      "src/server/services/**",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: [prismaImports] }],
    },
  },
  {
    files: ["src/lib/plan-engine/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            prismaImports,
            {
              group: [
                "next",
                "next/*",
                "react",
                "@/server/*",
                "@/app/*",
                "@/features/*",
              ],
              message:
                "The plan engine is pure: no server, next or prisma imports (CLAUDE.md rule 3).",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/server/db/generated/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;

import { config } from "dotenv";

// Integration tests run against their own database and Redis db, never the dev data.
const base = config({ path: ".env", quiet: true }).parsed ?? {};

const devUrl = new URL(process.env.DATABASE_URL ?? base.DATABASE_URL ?? "");
devUrl.pathname = `${devUrl.pathname}_test`;

export const testEnv: Record<string, string> = {
  ...base,
  NODE_ENV: "test",
  DATABASE_URL: devUrl.toString(),
  REDIS_URL: `${(base.REDIS_URL ?? "redis://127.0.0.1:6379").replace(/\/\d*$/, "")}/1`,
};

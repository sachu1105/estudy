import { execSync } from "node:child_process";

import { Client } from "pg";

import { testEnv } from "./test-env.mts";

/** Creates the test database if needed and applies every migration to it. */
export default async function setup() {
  const url = new URL(testEnv.DATABASE_URL);
  const dbName = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = "/postgres";

  const client = new Client({ connectionString: admin.toString() });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Integration tests need Postgres. Run \`docker compose up -d\` first.\n${String(error)}`,
    );
  }
  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName],
  );
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${dbName}"`);
  await client.end();

  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testEnv.DATABASE_URL },
    stdio: "pipe",
  });
}

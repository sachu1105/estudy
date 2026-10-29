import { config } from "dotenv";
import { Client } from "pg";

import { removeTestAccounts } from "./support/cleanup";

const env = config({ path: ".env", quiet: true }).parsed ?? {};

/** The paid squads switch as the global setup found it (the spec turns it on). */
async function restorePaidSquads() {
  const was = process.env.E2E_PAID_SQUADS_WAS;
  if (was === undefined) return;
  const db = new Client({
    connectionString: process.env.DATABASE_URL ?? env.DATABASE_URL,
  });
  await db.connect();
  try {
    if (was)
      await db.query(
        `UPDATE "AppSetting" SET value = $1::jsonb, "updatedAt" = now() WHERE key = 'paidSquads'`,
        [was],
      );
    else await db.query(`DELETE FROM "AppSetting" WHERE key = 'paidSquads'`);
  } finally {
    await db.end();
  }
}

/** Leaves the dev database as it was: no test accounts or their squads. */
export default async function globalTeardown() {
  await removeTestAccounts();
  await restorePaidSquads();
}

import { config } from "dotenv";
import { Redis } from "ioredis";
import { Client } from "pg";

const env = config({ path: ".env", quiet: true }).parsed ?? {};
const baseURL = `http://localhost:${Number(process.env.E2E_PORT ?? 3000)}`;

/**
 * The runtime settings the public pages read. The suite asserts the launch copy, so it
 * must not inherit whatever an admin last switched in the dev database: toggling
 * payments or the banner by hand is a normal thing to do while developing, and it used
 * to break six specs in a way that looks like an app bug.
 */
const BASELINE: Record<string, unknown> = {
  billing: { enabled: false },
  announcement: { active: false, text: "", tone: "info" },
};

/** The app re-reads settings within a second outside production; allow for a slow boot. */
const SETTLE_MS = 20_000;

async function resetSettings(db: Client) {
  let changed = false;
  for (const [key, value] of Object.entries(BASELINE)) {
    const { rowCount } = await db.query(
      `UPDATE "AppSetting" SET value = $2::jsonb, "updatedAt" = now()
       WHERE key = $1 AND value <> $2::jsonb`,
      [key, JSON.stringify(value)],
    );
    if (rowCount) changed = true;
  }
  return changed;
}

/**
 * Waits until the running app agrees payments are off, rather than guessing at its
 * cache. The pill only renders while billing is disabled, so it is the honest signal.
 */
async function waitForLaunchCopy() {
  const until = Date.now() + SETTLE_MS;
  for (;;) {
    const html = await fetch(baseURL).then(
      (r) => r.text(),
      () => "",
    );
    if (html.includes("Free during launch")) return;
    if (Date.now() > until)
      throw new Error(
        "The app still shows payments as on after resetting AppSetting. " +
          "Check the billing row in the dev database.",
      );
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export default async function globalSetup() {
  // Clear rate-limit counters so repeated local runs don't lock themselves out.
  const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  const keys = await redis.keys("rl:*");
  if (keys.length) await redis.del(...keys);
  redis.disconnect();

  const db = new Client({
    connectionString: process.env.DATABASE_URL ?? env.DATABASE_URL,
  });
  await db.connect();
  try {
    // The paid squads spec switches this on; the teardown restores what was here.
    const { rows } = await db.query(
      `SELECT value FROM "AppSetting" WHERE key = 'paidSquads'`,
    );
    process.env.E2E_PAID_SQUADS_WAS = rows[0]
      ? JSON.stringify(rows[0].value)
      : "";
    if (await resetSettings(db)) await waitForLaunchCopy();
  } finally {
    await db.end();
  }
}

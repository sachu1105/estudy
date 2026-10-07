import { config } from "dotenv";
import { Client } from "pg";

const env = config({ path: ".env", quiet: true }).parsed ?? {};

/** Logs that refuse row deletes (rule 6). Test accounts are the one exception. */
const APPEND_ONLY = [
  "AuditLog",
  "AiUsage",
  "TopicCompletion",
  "TaskCompletion",
  "StudySession",
  "XpLedger",
  "TestAttempt",
  "AttemptAnswer",
  "Payment",
];

/**
 * Deletes every test account (`@example.com`, a reserved domain no real person has)
 * and the squads they own, so e2e runs don't pile up in the dev database. Real
 * accounts and their squads are never touched.
 */
export async function removeTestAccounts() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL ?? env.DATABASE_URL,
  });
  await db.connect();
  try {
    await db.query("BEGIN");
    for (const table of APPEND_ONLY)
      await db.query(
        `ALTER TABLE "${table}" DISABLE TRIGGER "${table}_append_only"`,
      );
    const test = `SELECT id FROM "User" WHERE email LIKE '%@example.com'`;
    // The logs hold their users (onDelete: Restrict), so test rows go first.
    await db.query(
      `DELETE FROM "AttemptAnswer" WHERE "attemptId" IN (SELECT id FROM "TestAttempt" WHERE "userId" IN (${test}))`,
    );
    for (const table of [
      "TestAttempt",
      "XpLedger",
      "StudySession",
      "TaskCompletion",
      "TopicCompletion",
      "AiUsage",
    ])
      await db.query(`DELETE FROM "${table}" WHERE "userId" IN (${test})`);
    await db.query(`DELETE FROM "AuditLog" WHERE "actorId" IN (${test})`);
    const groups = await db.query(
      `DELETE FROM "Group" WHERE "ownerId" IN (${test})`,
    );
    const users = await db.query(`DELETE FROM "User" WHERE id IN (${test})`);
    for (const table of APPEND_ONLY)
      await db.query(
        `ALTER TABLE "${table}" ENABLE TRIGGER "${table}_append_only"`,
      );
    await db.query("COMMIT");
    return { users: users.rowCount ?? 0, groups: groups.rowCount ?? 0 };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
}

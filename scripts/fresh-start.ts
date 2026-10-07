// One-off: clears what e2e runs left in the shared catalogue and question pool before
// the teardown existed, and keeps only the four Kerala PSC exams.
//   pnpm tsx scripts/fresh-start.ts            dry run: prints counts, changes nothing
//   pnpm tsx scripts/fresh-start.ts --commit   does it
// Real accounts, their syllabuses, pods and plans are not touched.
import { config } from "dotenv";
import { Client } from "pg";

const env = config({ path: ".env", quiet: true }).parsed ?? {};
const commit = process.argv.includes("--commit");

const STEPS: [string, string][] = [
  // Every catalogue syllabus in the dev database came from an e2e run.
  [
    "catalogue syllabuses",
    `DELETE FROM "SyllabusVersion" WHERE visibility = 'CATALOGUE'`,
  ],
  // Every pool question is e2e seed data; full mocks built from them go too.
  [
    "mock tests without attempts",
    `DELETE FROM "MockTest" m WHERE NOT EXISTS (SELECT 1 FROM "TestAttempt" t WHERE t."mockTestId" = m.id)`,
  ],
  ["questions", `DELETE FROM "Question" WHERE "sourceRef" IN ('e2e', 'Test')`],
  [
    "exams other than LDC, LGS, Degree level and Plus two level",
    `DELETE FROM "Exam" WHERE slug IN ('kerala-hc-assistant', 'ssc-cgl', 'ssc-chsl', 'rrb-ntpc')`,
  ],
  [
    "parse results no syllabus points to",
    `DELETE FROM "SyllabusParse" p WHERE NOT EXISTS (SELECT 1 FROM "SyllabusVersion" s WHERE s."parseId" = p.id)`,
  ],
];

async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  try {
    await db.query("BEGIN");
    for (const [label, sql] of STEPS)
      console.log(`${label}: ${(await db.query(sql)).rowCount}`);
    await db.query(commit ? "COMMIT" : "ROLLBACK");
    console.log(commit ? "Done." : "Dry run: nothing changed. Add --commit.");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

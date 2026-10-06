import { randomUUID } from "node:crypto";

import { config } from "dotenv";
import { Client } from "pg";

const env = config({ path: ".env", quiet: true }).parsed ?? {};

async function withDb<T>(run: (db: Client) => Promise<T>) {
  const db = new Client({
    connectionString: process.env.DATABASE_URL ?? env.DATABASE_URL,
  });
  await db.connect();
  try {
    return await run(db);
  } finally {
    await db.end();
  }
}

/**
 * A syllabus the worker has already read, waiting for review: what a user sees once
 * parsing is done. Lets the review screen be tested without running the AI.
 */
type SeedTree = {
  subjects: {
    name: string;
    topics: {
      name: string;
      weight: number;
      difficulty: number;
      foundational: boolean;
    }[];
  }[];
};

/** The largest real parse in the dev database, for screenshots. */
export function latestParsedTree() {
  return withDb(async (db) => {
    const { rows } = await db.query<{ tree: SeedTree }>(
      `SELECT tree FROM "SyllabusParse" WHERE provider <> 'fake' AND "promptVersion" = 'structure-syllabus@4' ORDER BY jsonb_array_length(tree->'subjects') DESC, "createdAt" DESC LIMIT 1`,
    );
    return rows[0]?.tree ?? null;
  });
}

export function seedParsedDraft(
  ownerId: string,
  title: string,
  seedTree?: SeedTree,
) {
  return withDb(async (db) => {
    const parseId = randomUUID();
    const versionId = randomUUID();
    const tree: SeedTree = seedTree ?? {
      subjects: [
        {
          name: "Indian Constitution",
          topics: [
            { name: "Preamble", weight: 3, difficulty: 2, foundational: true },
            {
              name: "Fundamental rights",
              weight: 5,
              difficulty: 3,
              foundational: false,
            },
            {
              name: "Directive principles",
              weight: 4,
              difficulty: 3,
              foundational: false,
            },
          ],
        },
        {
          name: "Kerala geography",
          topics: [
            {
              name: "Rivers of Kerala",
              weight: 4,
              difficulty: 2,
              foundational: false,
            },
          ],
        },
      ],
    };
    await db.query(
      `INSERT INTO "SyllabusParse" (id, "fileHash", "sourceKind", "extractedText", tree, provider, model, "promptVersion")
       VALUES ($1, $2, 'TEXT', $3, $4, 'fake', 'seed', 'seed@1')`,
      [
        parseId,
        randomUUID().replace(/-/g, "").padEnd(64, "0"),
        "Part I Indian Constitution\nPreamble, fundamental rights, directive principles\nPart II Kerala geography\nRivers of Kerala",
        JSON.stringify(tree),
      ],
    );
    await db.query(
      `INSERT INTO "SyllabusVersion" (id, title, "ownerId", "fileHash", "sourceFileKey", "sourceKind", "parseId", "updatedAt")
       VALUES ($1, $2, $3, 'seed', 'seed', 'TEXT', $4, now())`,
      [versionId, title, ownerId, parseId],
    );
    for (const [order, subject] of tree.subjects.entries()) {
      const subjectId = randomUUID();
      await db.query(
        `INSERT INTO "Subject" (id, "syllabusVersionId", name, "order") VALUES ($1, $2, $3, $4)`,
        [subjectId, versionId, subject.name, order],
      );
      for (const [topicOrder, t] of subject.topics.entries())
        await db.query(
          `INSERT INTO "Topic" (id, "subjectId", name, weight, difficulty, foundational, "order")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            randomUUID(),
            subjectId,
            t.name,
            t.weight,
            t.difficulty,
            t.foundational,
            topicOrder,
          ],
        );
    }
    await db.query(
      `INSERT INTO "ParseJob" (id, "syllabusVersionId", "userId", status, stage, progress, "updatedAt", "finishedAt")
       VALUES ($1, $2, $3, 'READY', 'READY', 100, now(), now())`,
      [randomUUID(), versionId, ownerId],
    );
    return versionId;
  });
}

/**
 * A verified user straight in the database, for specs that need a user of their own.
 * Registering through the form is rate limited per IP; logging in is not as tight.
 */
export async function seedVerifiedUser(
  email: string,
  password: string,
  role: "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN" = "USER",
) {
  const { hash } = await import("@node-rs/argon2");
  const passwordHash = await hash(password, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  await withDb(async (db) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO "User" (id, email, "emailVerifiedAt", "passwordHash", name, "displayName", role, "updatedAt")
       VALUES ($1, $2, now(), $3, 'Test Aspirant', 'Test Aspirant', $4, now())`,
      [id, email, passwordHash, role],
    );
    await db.query(
      `INSERT INTO "Subscription" (id, "userId", plan, status, source, "updatedAt")
       VALUES ($1, $2, 'FREE', 'ACTIVE', 'DEFAULT', now())`,
      [randomUUID(), id],
    );
  });
}

/**
 * Verified practice questions for these topic names (the right answer is always the
 * first option), so check tests and mocks have a pool.
 */
export async function seedQuestions(topics: string[], perTopic = 5) {
  await withDb(async (db) => {
    for (const topic of topics) {
      const key = topic
        .toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
        .trim();
      for (let i = 1; i <= perTopic; i++)
        await db.query(
          `INSERT INTO "Question" (id, "topicKey", difficulty, language, body, options, "correctIndex", explanation, status, source, "sourceRef", "updatedAt")
           VALUES ($1, $2, 2, 'EN', $3, $4, 0, $5, 'VERIFIED', 'ADMIN', 'e2e', now())`,
          [
            randomUUID(),
            key,
            `${topic}: practice question ${i} (${randomUUID().slice(0, 6)})?`,
            [`Right answer ${i}`, `Wrong ${i}a`, `Wrong ${i}b`, `Wrong ${i}c`],
            `Explained: answer ${i} is right.`,
          ],
        );
    }
  });
}

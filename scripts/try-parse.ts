// Manual check of the real pipeline: submits a syllabus file or text through the upload
// service, then follows the job until the worker (pnpm worker) finishes it.
//   pnpm tsx --conditions=react-server scripts/try-parse.ts path/to/syllabus.pdf
import "dotenv/config";

import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { uploadService } from "@/server/services/syllabus";
import { sniffKind } from "@/server/services/syllabus/extract";
import { storage } from "@/server/storage";

async function main() {
  const path = process.argv[2];
  if (!path)
    throw new Error(
      "Usage: scripts/try-parse.ts <file.pdf|file.docx|file.txt>",
    );
  const email = "parse-check@studyplanner.local";
  const user =
    (await prisma.user.findUnique({
      where: { email },
      include: { subscriptions: true },
    })) ??
    (await prisma.user.create({
      data: {
        email,
        passwordHash: "x",
        name: "Parse check",
        displayName: "Parse check",
        subscriptions: { create: { plan: "ELITE" } },
      },
      include: { subscriptions: true },
    }));
  const actor = { id: user.id, subscription: user.subscriptions[0] ?? null };
  const bytes = new Uint8Array(readFileSync(path));
  const title = basename(path).replace(/\.[^.]+$/, "");

  let result;
  if (sniffKind(bytes)) {
    const key = `syllabus/${user.id}/${crypto.randomUUID()}`;
    await storage.put(key, bytes, "application/octet-stream");
    result = await uploadService.completeUpload(actor, {
      key,
      title,
      examId: null,
      sourceName: basename(path),
    });
  } else {
    result = await uploadService.submitText(actor, {
      title,
      examId: null,
      text: new TextDecoder().decode(bytes),
    });
  }
  if (!result.ok) throw new Error(result.message);
  console.log(
    `version ${result.versionId}, job ${result.jobId}${result.reused ? " (reused)" : ""}`,
  );

  const started = Date.now();
  for (;;) {
    const job = await prisma.parseJob.findUniqueOrThrow({
      where: { id: result.jobId },
    });
    process.stdout.write(`\r${job.status} ${job.stage} ${job.progress}%   `);
    if (job.status === "READY" || job.status === "FAILED") {
      console.log(
        `\n${job.status} after ${Math.round((Date.now() - started) / 1000)}s ${job.error ?? ""}`,
      );
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  const version = await syllabusRepository.findOwned(result.versionId, user.id);
  for (const subject of version?.subjects ?? []) {
    console.log(`\n${subject.name}`);
    for (const t of subject.topics)
      console.log(
        `  - ${t.name}  [w${t.weight} d${t.difficulty}${t.foundational ? " F" : ""}]`,
      );
  }
  const usage = await prisma.aiUsage.findMany({
    where: { refId: result.jobId },
  });
  console.log(
    `\nAI calls: ${usage.length}, ok: ${usage.filter((u) => u.ok).length}, tokens in/out: ${usage.reduce((n, u) => n + u.inputTokens, 0)}/${usage.reduce((n, u) => n + u.outputTokens, 0)}`,
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit();
  });

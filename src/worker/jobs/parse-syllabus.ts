import { Worker } from "bullmq";

import { createAiProvider } from "@/server/ai";
import { env } from "@/server/env";
import {
  PARSE_QUEUE,
  parseJobDataSchema,
  queueConnection,
  type ParseJobData,
} from "@/server/queue";
import { syllabusDeps } from "@/server/services/syllabus";
import { unavailableOcr } from "@/server/services/syllabus/extract";
import { createParseService } from "@/server/services/syllabus/parse-service";

export function startParseWorker() {
  const ai = createAiProvider();
  const parser = createParseService({
    ...syllabusDeps,
    ai,
    ocr: unavailableOcr,
  });

  const worker = new Worker<ParseJobData>(
    PARSE_QUEUE,
    async (job) => {
      const { parseJobId } = parseJobDataSchema.parse(job.data);
      await parser.run(parseJobId, {
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts ?? 1,
      });
    },
    {
      connection: queueConnection(),
      concurrency: env.WORKER_CONCURRENCY,
      // A long chunk on a local model can take minutes; the lock is renewed meanwhile.
      lockDuration: 120_000,
    },
  );

  worker.on("completed", (job) =>
    console.log(`[worker] parse ${job.data.parseJobId} done`),
  );
  worker.on("failed", (job, error) =>
    console.warn(
      `[worker] parse ${job?.data.parseJobId} attempt ${job?.attemptsMade} failed: ${error.message}`,
    ),
  );
  console.log(
    `[worker] ${PARSE_QUEUE}: ${ai.name} (${ai.model}), concurrency ${env.WORKER_CONCURRENCY}`,
  );
  return worker;
}

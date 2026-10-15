import { Worker } from "bullmq";

import { currentAiProvider } from "@/server/ai";
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
  const worker = new Worker<ParseJobData>(
    PARSE_QUEUE,
    async (job) => {
      const { parseJobId } = parseJobDataSchema.parse(job.data);
      // Built per job from Admin > AI, so a new model, key or switch applies to the next
      // job without restarting the worker. With AI off it is never called.
      const parser = createParseService({
        ...syllabusDeps,
        ai: await currentAiProvider(),
        ocr: unavailableOcr,
      });
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
    `[worker] ${PARSE_QUEUE}: rules, or the model set in Admin > AI while AI is on; concurrency ${env.WORKER_CONCURRENCY}`,
  );
  return worker;
}

import { Queue, QueueEvents, Worker } from "bullmq";

import { currentAiProvider } from "@/server/ai";
import type { AIProvider } from "@/server/ai/types";
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
      const { parseJobId, fresh } = parseJobDataSchema.parse(job.data);
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
        fresh,
      });
    },
    {
      connection: queueConnection(),
      concurrency: env.WORKER_CONCURRENCY,
      // A long chunk on a local model can take minutes; the lock is renewed meanwhile.
      lockDuration: 120_000,
    },
  );

  // A job the queue fails by itself (stalled: the worker was stopped or restarted mid-read)
  // never reaches the catch in run(), so its status is closed here, and at every start.
  const closer = createParseService({
    ...syllabusDeps,
    ai: notUsed,
    ocr: unavailableOcr,
  });
  const queue = new Queue(PARSE_QUEUE, { connection: queueConnection() });
  const events = new QueueEvents(PARSE_QUEUE, {
    connection: queueConnection(),
  });
  events.on("failed", ({ jobId }) => {
    void queue
      .getJobState(jobId)
      .then((state) => (state === "failed" ? closer.abandon(jobId) : null))
      .catch((error) =>
        console.warn(`[worker] closing parse ${jobId}: ${String(error)}`),
      );
  });
  void closer
    .sweep(async (id) => {
      const state = await queue.getJobState(id);
      return state === "failed" || state === "completed" || state === "unknown";
    })
    .then((n) => n && console.log(`[worker] closed ${n} abandoned parse jobs`))
    .catch((error) => console.warn(`[worker] parse sweep: ${String(error)}`));

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
  return {
    close: () =>
      Promise.all([worker.close(), events.close(), queue.close()]).then(
        () => {},
      ),
  };
}

/** The closer never reads a syllabus, so it never calls the model. */
const notUsed: AIProvider = {
  name: "fake",
  model: "none",
  readsDocuments: false,
  generate: () => Promise.reject(new Error("Not used to read syllabuses.")),
};

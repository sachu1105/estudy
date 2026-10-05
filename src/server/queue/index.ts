import "server-only";

import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { env } from "@/server/env";

import { PARSE_QUEUE, type ParseJobData, type ParseQueue } from "./types";

export * from "./types";

/** BullMQ needs its own connections with no per-request retry limit. */
export function queueConnection() {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

const globalForQueue = globalThis as unknown as {
  parseQueue?: Queue<ParseJobData>;
};

function bullQueue() {
  globalForQueue.parseQueue ??= new Queue<ParseJobData>(PARSE_QUEUE, {
    connection: queueConnection(),
  });
  return globalForQueue.parseQueue;
}

export const parseQueue: ParseQueue = {
  async enqueue(data, { priority }) {
    await bullQueue().add("parse", data, {
      // Our id, so a double click can't queue the same job twice.
      jobId: data.parseJobId,
      // Lower runs first: ELITE users get priority parsing.
      priority: priority === "high" ? 1 : 10,
      attempts: 3,
      backoff: { type: "exponential", delay: 15_000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    });
  },
};

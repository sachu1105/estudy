import "server-only";

import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { env } from "@/server/env";

import {
  PARSE_QUEUE,
  POD_QUEUE,
  type ParseJobData,
  type ParseQueue,
  type PodJob,
  type PodQueue,
} from "./types";

export * from "./types";

/** BullMQ needs its own connections with no per-request retry limit. */
export function queueConnection() {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

const globalForQueue = globalThis as unknown as {
  parseQueue?: Queue<ParseJobData>;
  podQueue?: Queue<PodJob>;
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

  async cancel(parseJobId) {
    const job = await bullQueue().getJob(parseJobId);
    // remove() refuses a job a worker holds; that one checks for deletion and stops.
    await job?.remove().catch(() => {});
  },

  async readerOnline() {
    return (await bullQueue().getWorkersCount()) > 0;
  },
};

function bullPodQueue() {
  globalForQueue.podQueue ??= new Queue<PodJob>(POD_QUEUE, {
    connection: queueConnection(),
  });
  return globalForQueue.podQueue;
}

export const podQueue: PodQueue = {
  async enqueue(job) {
    await bullPodQueue().add(job.kind, job, {
      jobId: "itemId" in job ? `${job.kind}-${job.itemId}` : undefined,
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    });
  },
};

/**
 * Daily trash purge (30 days) and the Sunday re-plan at 04:00 IST. Safe to call at every
 * worker start.
 */
export async function schedulePodMaintenance() {
  await bullPodQueue().upsertJobScheduler(
    "purge-trash-daily",
    { pattern: "30 3 * * *", tz: "Asia/Kolkata" },
    { name: "purge-trash", data: { kind: "purge-trash" } },
  );
  await bullPodQueue().upsertJobScheduler(
    "replan-weekly",
    { pattern: "0 4 * * 0", tz: "Asia/Kolkata" },
    { name: "replan-week", data: { kind: "replan-week" } },
  );
}

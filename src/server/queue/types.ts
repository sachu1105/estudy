import { z } from "zod";

export const PARSE_QUEUE = "syllabus-parse";

/** Job payloads cross a process boundary, so they're parsed with zod (rule 11). */
export const parseJobDataSchema = z.object({ parseJobId: z.uuid() });
export type ParseJobData = z.infer<typeof parseJobDataSchema>;

export interface ParseQueue {
  enqueue(
    data: ParseJobData,
    options: { priority: "normal" | "high" },
  ): Promise<void>;
  /** Takes a waiting job off the queue. A job already running is left to stop by itself. */
  cancel(parseJobId: string): Promise<void>;
  /** Whether any worker is connected and able to pick up parse jobs. */
  readerOnline(): Promise<boolean>;
}

export const POD_QUEUE = "pods";

/** Background work for pod material. Payloads are zod-parsed in the worker (rule 11). */
export const podJobSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("link-meta"), itemId: z.uuid() }),
  z.object({ kind: z.literal("extract-file"), itemId: z.uuid() }),
  z.object({ kind: z.literal("purge-trash") }),
  // Sunday: every active study plan is re-made from that day (milestone 7).
  z.object({ kind: z.literal("replan-week") }),
  // Nightly: leaderboards rebuilt from the XP log, the source of truth (milestone 12).
  z.object({ kind: z.literal("rebuild-ranks") }),
]);
export type PodJob = z.infer<typeof podJobSchema>;

export interface PodQueue {
  enqueue(job: PodJob): Promise<void>;
}

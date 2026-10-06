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

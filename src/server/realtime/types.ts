export interface Publisher {
  publish(channel: string, payload: unknown): Promise<void>;
}

export const jobChannel = (parseJobId: string) => `job:${parseJobId}`;

/** What the UI shows for a parse job. Sent over SSE and returned by the polling route. */
export type JobEvent = {
  id: string;
  status: "QUEUED" | "RUNNING" | "READY" | "FAILED";
  stage: "QUEUED" | "READING" | "STRUCTURING" | "READY" | "FAILED";
  progress: number;
  error: string | null;
  reused: boolean;
};

export const isTerminal = (event: Pick<JobEvent, "status">) =>
  event.status === "READY" || event.status === "FAILED";

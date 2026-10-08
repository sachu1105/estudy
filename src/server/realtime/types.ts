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

export const groupChannel = (groupId: string) => `group:${groupId}`;

/**
 * Something changed in a group's discussion. Carries ids only: each client re-reads
 * what it may see, so blocks and hidden posts are applied on the server.
 */
export type GroupEvent =
  | {
      type: "post" | "reply" | "reaction" | "update";
      postId: string;
    }
  | {
      /** A chat message was sent, edited, deleted or reacted to (squads S3). */
      type: "message";
      action: "new" | "edit" | "delete" | "react";
      channelId: string;
      messageId: string;
      /** The sender, so their own other tabs can skip the unread dot. */
      authorId: string;
    };

/** Sends group events to every open stream, and keeps a short log to resume from. */
export interface GroupEvents {
  emit(groupId: string, event: GroupEvent): Promise<void>;
}

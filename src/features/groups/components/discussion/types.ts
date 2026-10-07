import type { Mention } from "@/lib/markdown/markdown";

export type Person = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type PostSummary = {
  id: string;
  kind: "DISCUSSION" | "QUESTION";
  title: string;
  preview: string;
  topicName: string | null;
  author: Person;
  replyCount: number;
  answered: boolean;
  pinned: boolean;
  hidden: boolean;
  when: string;
  /** Shown before the server has it (optimistic). */
  pending?: boolean;
};

export type ReactionTally = {
  kind: "LIKE" | "HELPFUL" | "THANKS";
  count: number;
  mine: boolean;
};

export type ReplyView = {
  id: string;
  body: string;
  hidden: boolean;
  author: Person;
  when: string;
  mentions: Mention[];
  reactions: ReactionTally[];
  mine: boolean;
  pending?: boolean;
};

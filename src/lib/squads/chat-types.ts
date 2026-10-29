// What the chat shows of one message to one person (squads S3). Shared by the chat
// service and the chat components.

export type Reaction = "LIKE" | "HELPFUL" | "THANKS";

/** A message as the chat shows it to one person. */
export type MessageView = {
  id: string;
  body: string;
  deleted: boolean;
  hidden: boolean;
  edited: boolean;
  at: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    /** On a paid plan: the verified seal after the name. */
    verified?: boolean;
  };
  mentions: { id: string; name: string }[];
  replyTo: { id: string; author: string; preview: string } | null;
  item: {
    id: string;
    type: "NOTE" | "LINK" | "FILE" | "IMAGE";
    title: string;
    url: string | null;
    /** Stored files, in order: photos are drawn in the chat from these. */
    files: { id: string; mimeType: string }[];
  } | null;
  reactions: { kind: Reaction; count: number; mine: boolean }[];
  mine: boolean;
  canDelete: boolean;
  /** A plain message, a doubt for others to answer, or a poll. */
  kind: "TEXT" | "DOUBT" | "POLL";
  /** On a doubt: how many answers (its replies), and the one its asker chose. */
  doubt: { answers: number; acceptedId: string | null } | null;
  /** On a reply to a doubt: whether it's the chosen answer, and if this person may choose. */
  answer: { best: boolean; canChoose: boolean } | null;
  /** On a poll: each choice with its votes, the person's own marked. */
  poll: {
    options: { id: string; text: string; votes: number; mine: boolean }[];
    total: number;
  } | null;
  /** A mock test shared with the message, for everyone to take. */
  test: {
    id: string;
    title: string;
    questions: number;
    minutes: number | null;
  } | null;
};

/** A message the person just sent, shown before the server has it. */
export type PendingMessage = MessageView & { pending?: boolean };

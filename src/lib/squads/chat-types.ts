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
  author: { id: string; displayName: string; avatarUrl: string | null };
  mentions: { id: string; name: string }[];
  replyTo: { id: string; author: string; preview: string } | null;
  item: {
    id: string;
    type: "NOTE" | "LINK" | "FILE" | "IMAGE";
    title: string;
    url: string | null;
  } | null;
  reactions: { kind: Reaction; count: number; mine: boolean }[];
  mine: boolean;
  canDelete: boolean;
};

/** A message the person just sent, shown before the server has it. */
export type PendingMessage = MessageView & { pending?: boolean };

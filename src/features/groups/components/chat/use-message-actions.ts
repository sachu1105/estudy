"use client";

import { useState, useTransition } from "react";

import { toast } from "@/components/ui/toast";
import { plainText } from "@/lib/markdown/markdown";
import type { PendingMessage, Reaction } from "@/lib/squads/chat-types";

import {
  deleteMessageAction,
  editMessageAction,
  reactMessageAction,
  sendMessageAction,
} from "../../chat-actions";
import { uploadChatFiles } from "../../upload";
import type { Outgoing } from "./composer";
import type { useChat } from "./use-chat";

/**
 * Sending, replying, editing, deleting and reacting. Each shows at once (optimistic UI)
 * and is taken back, with the reason, if the server says no.
 */
export function useMessageActions({
  groupId,
  channelId,
  me,
  chat,
}: {
  groupId: string;
  channelId: string;
  me: { id: string; displayName: string; avatarUrl: string | null };
  chat: ReturnType<typeof useChat>;
}) {
  const [, start] = useTransition();
  const [replyTo, setReplyTo] = useState<PendingMessage | null>(null);
  const [editing, setEditing] = useState<PendingMessage | null>(null);
  const where = { groupId, channelId };
  const undo = (error: string) => {
    toast.error(error);
    void chat.catchUp();
  };

  const send = (out: Outgoing) => {
    const tempId = `pending-${crypto.randomUUID()}`;
    const temp: PendingMessage = {
      id: tempId,
      body: out.body.trim(),
      deleted: false,
      hidden: false,
      edited: false,
      at: new Date().toISOString(),
      author: me,
      mentions: [],
      replyTo: replyTo
        ? {
            id: replyTo.id,
            author: replyTo.author.displayName,
            preview: plainText(replyTo.body, 80),
          }
        : null,
      // Files still on their way show as a placeholder card until the server has them.
      item: out.files.length
        ? {
            id: tempId,
            type: out.files.some((f) => f.type === "application/pdf")
              ? "FILE"
              : "IMAGE",
            title: "Uploading…",
            url: null,
            files: [],
          }
        : null,
      reactions: [],
      mine: true,
      canDelete: false,
      kind: out.pollOptions ? "POLL" : out.doubt ? "DOUBT" : "TEXT",
      doubt: out.doubt ? { answers: 0, acceptedId: null } : null,
      answer: null,
      poll: out.pollOptions
        ? {
            options: out.pollOptions.map((text, i) => ({
              id: `${tempId}-${i}`,
              text,
              votes: 0,
              mine: false,
            })),
            total: 0,
          }
        : null,
      test: null,
    };
    const settle = chat.addPending(temp);
    const replyToId = replyTo?.id ?? null;
    setReplyTo(null);
    start(async () => {
      let uploads: { key: string; name: string }[] = [];
      if (out.files.length) {
        try {
          uploads = await uploadChatFiles(groupId, channelId, out.files);
        } catch (error) {
          settle(null);
          return void toast.error(
            error instanceof Error
              ? error.message
              : "The files didn't upload. Try again.",
          );
        }
      }
      const result = await sendMessageAction({
        ...where,
        body: out.body,
        replyToId,
        mentionIds: out.mentionIds,
        podItemId: out.attachment?.id ?? null,
        uploads,
        doubt: out.doubt,
        pollOptions: out.pollOptions,
      });
      if (!result.ok) {
        settle(null);
        return void toast.error(result.error);
      }
      settle(result.message);
    });
  };

  const saveEdit = (target: PendingMessage, out: Outgoing) => {
    chat.patch(target.id, (m) => ({
      ...m,
      body: out.body.trim(),
      edited: true,
    }));
    setEditing(null);
    start(async () => {
      const result = await editMessageAction({
        ...where,
        messageId: target.id,
        body: out.body,
        mentionIds: out.mentionIds,
      });
      if (!result.ok) undo(result.error);
    });
  };

  return {
    editing,
    context: editing
      ? "Editing your message"
      : replyTo
        ? `Replying to ${replyTo.author.displayName}`
        : null,
    startReply: (m: PendingMessage) => {
      setEditing(null);
      setReplyTo(m);
    },
    startEdit: (m: PendingMessage) => {
      setReplyTo(null);
      setEditing(m);
    },
    cancel: () => {
      setReplyTo(null);
      setEditing(null);
    },
    /** True when the box can be cleared. */
    submit: (out: Outgoing) => {
      if (editing) saveEdit(editing, out);
      else send(out);
      return true;
    },
    remove: (m: PendingMessage) => {
      chat.patch(m.id, (x) => ({ ...x, deleted: true, body: "", item: null }));
      start(async () => {
        const result = await deleteMessageAction({ ...where, messageId: m.id });
        if (!result.ok) undo(result.error);
      });
    },
    react: (m: PendingMessage, kind: Reaction) => {
      const current = m.reactions.find((r) => r.kind === kind);
      const on = !current?.mine;
      chat.patch(m.id, (x) => {
        const others = x.reactions.filter((r) => r.kind !== kind);
        const count = (current?.count ?? 0) + (on ? 1 : -1);
        return { ...x, reactions: [...others, { kind, count, mine: on }] };
      });
      start(async () => {
        const result = await reactMessageAction({
          ...where,
          messageId: m.id,
          kind,
          on,
        });
        if (!result.ok) undo(result.error);
      });
    },
  };
}

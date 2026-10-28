"use client";

import { useTransition } from "react";

import { toast } from "@/components/ui/toast";
import type { PendingMessage } from "@/lib/squads/chat-types";

import { acceptAnswerAction, votePollAction } from "../../chat-actions";
import type { useChat } from "./use-chat";

/**
 * Voting on polls and choosing a doubt's best answer. Both show at once and are taken
 * back, with the reason, if the server says no.
 */
export function usePollActions({
  groupId,
  channelId,
  chat,
}: {
  groupId: string;
  channelId: string;
  chat: ReturnType<typeof useChat>;
}) {
  const [, start] = useTransition();
  const where = { groupId, channelId };
  const undo = (error: string) => {
    toast.error(error);
    void chat.catchUp();
  };

  return {
    /** The same choice again takes the vote back; another moves it. */
    vote: (m: PendingMessage, optionId: string) => {
      chat.patch(m.id, (x) => {
        if (!x.poll) return x;
        const again = x.poll.options.some((o) => o.id === optionId && o.mine);
        const had = x.poll.options.some((o) => o.mine);
        const options = x.poll.options.map((o) => {
          const mine = !again && o.id === optionId;
          return {
            ...o,
            mine,
            votes: o.votes - (o.mine ? 1 : 0) + (mine ? 1 : 0),
          };
        });
        const total = x.poll.total - (had ? 1 : 0) + (again ? 0 : 1);
        return { ...x, poll: { options, total } };
      });
      start(async () => {
        const result = await votePollAction({
          ...where,
          messageId: m.id,
          optionId,
        });
        if (!result.ok) undo(result.error);
      });
    },

    /** The asker marks this reply as the best answer to their doubt, or unmarks it. */
    choose: (m: PendingMessage, best: boolean) => {
      chat.patch(m.id, (x) =>
        x.answer ? { ...x, answer: { ...x.answer, best } } : x,
      );
      start(async () => {
        const result = await acceptAnswerAction({
          ...where,
          messageId: m.id,
          best,
        });
        if (!result.ok) return undo(result.error);
        toast.success(best ? "Marked as the best answer" : "Mark taken off");
        // Other answers lose the mark, and the doubt shows it's answered.
        void chat.catchUp();
      });
    },
  };
}

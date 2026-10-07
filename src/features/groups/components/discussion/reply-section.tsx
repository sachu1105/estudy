"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { toast } from "@/components/ui/toast";
import type { Mention } from "@/lib/markdown/markdown";

import { acceptAnswerAction, replyAction } from "../../discussion-actions";
import { ReplyComposer } from "./reply-composer";
import { ReplyItem } from "./reply-item";
import type { Person, ReplyView } from "./types";

/** Replies, sent and accepted optimistically; a refused change is taken back. */
export function ReplySection({
  groupId,
  postId,
  me,
  replies,
  acceptedId,
  question,
  canAccept,
  admin,
  muted,
  members,
}: {
  groupId: string;
  postId: string;
  me: Person;
  replies: ReplyView[];
  acceptedId: string | null;
  question: boolean;
  canAccept: boolean;
  admin: boolean;
  muted: boolean;
  members: Mention[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [shown, add] = useOptimistic(replies, (state, reply: ReplyView) => [
    ...state,
    reply,
  ]);
  const [accepted, setAccepted] = useOptimistic(acceptedId);

  const send = (body: string, mentionIds: string[]) =>
    new Promise<boolean>((resolve) =>
      start(async () => {
        add({
          id: `pending-${shown.length}`,
          body,
          hidden: false,
          author: me,
          when: "",
          mentions: members.filter((m) => mentionIds.includes(m.id)),
          reactions: [],
          mine: true,
          pending: true,
        });
        const result = await replyAction({ groupId, postId, body, mentionIds });
        if (!result.ok) {
          toast.error(result.error);
          return resolve(false);
        }
        router.refresh();
        resolve(true);
      }),
    );

  const accept = (replyId: string | null) =>
    start(async () => {
      setAccepted(replyId);
      const result = await acceptAnswerAction({ groupId, postId, replyId });
      if (!result.ok) return void toast.error(result.error);
      if (replyId)
        toast.success(
          result.xp
            ? `Answer accepted. It earned ${result.xp} XP.`
            : "Answer accepted",
        );
      router.refresh();
    });

  const noun = question ? "answer" : "reply";
  const plural = question ? "answers" : "replies";
  return (
    <section aria-label="Replies" className="flex flex-col gap-3">
      <h3 className="text-h3">
        {shown.length} {shown.length === 1 ? noun : plural}
      </h3>
      <ol className="flex flex-col gap-3">
        {shown.map((r) => (
          <ReplyItem
            key={r.id}
            groupId={groupId}
            postId={postId}
            reply={r}
            accepted={accepted === r.id}
            canAccept={canAccept}
            admin={admin}
            onAccept={accept}
          />
        ))}
      </ol>
      {muted ? (
        <p className="text-small text-ink-muted">
          A squad admin has muted you for now, so you can read but not reply.
        </p>
      ) : (
        <ReplyComposer
          postId={postId}
          members={members}
          question={question}
          onSend={send}
        />
      )}
    </section>
  );
}

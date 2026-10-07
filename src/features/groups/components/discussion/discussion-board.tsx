"use client";

import { MessagesSquare, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import type { Mention } from "@/lib/markdown/markdown";
import { plainText } from "@/lib/markdown/markdown";

import { createPostAction } from "../../discussion-actions";
import { NewPostSheet, type NewPost } from "./new-post-sheet";
import { PostRow } from "./post-row";
import type { Person, PostSummary } from "./types";

/** The group's threads, with a new post shown at once and taken back if it fails. */
export function DiscussionBoard({
  groupId,
  me,
  posts,
  members,
  topics,
  muted,
}: {
  groupId: string;
  me: Person;
  posts: PostSummary[];
  members: Mention[];
  topics: string[];
  muted: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const [shown, addShown] = useOptimistic(posts, (state, post: PostSummary) => [
    post,
    ...state,
  ]);

  const submit = (post: NewPost) =>
    new Promise<boolean>((resolve) => {
      setOpen(false);
      start(async () => {
        addShown({
          id: `pending-${post.title}`,
          kind: post.kind,
          title: post.title,
          preview: plainText(post.body, 140),
          topicName: post.topicName,
          author: me,
          replyCount: 0,
          answered: false,
          pinned: false,
          hidden: false,
          when: "",
          pending: true,
        });
        const result = await createPostAction({ groupId, ...post });
        if (!result.ok) {
          toast.error(result.error);
          setOpen(true);
          return resolve(false);
        }
        toast.success("Posted");
        router.refresh();
        resolve(true);
      });
    });

  return (
    <div className="flex flex-col gap-4">
      {muted ? null : (
        <Button
          variant="primary"
          className="self-start"
          onClick={() => setOpen(true)}
        >
          <Plus aria-hidden /> New post
        </Button>
      )}
      {shown.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No posts yet"
          description="Ask a doubt or start a discussion. Answers others accept earn XP."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {shown.map((p) => (
            <PostRow key={p.id} groupId={groupId} post={p} />
          ))}
        </ul>
      )}
      <NewPostSheet
        groupId={groupId}
        open={open}
        onOpenChange={setOpen}
        members={members}
        topics={topics}
        onSubmit={submit}
      />
    </div>
  );
}

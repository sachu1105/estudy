"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { mentionedIn, type Mention } from "@/lib/markdown/markdown";

import { MentionTextarea } from "./mention-textarea";
import { TopicPicker } from "./topic-picker";
import { useDraft } from "./use-draft";

export type NewPost = {
  kind: "DISCUSSION" | "QUESTION";
  title: string;
  body: string;
  mentionIds: string[];
  subjectName: string | null;
  topicName: string | null;
};

/** Start a thread, or ask a question tagged with a topic. The text is kept as a draft. */
export function NewPostSheet({
  groupId,
  open,
  onOpenChange,
  members,
  topics,
  onSubmit,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Mention[];
  topics: string[];
  /** Resolves true once posted; the draft is cleared then. */
  onSubmit: (post: NewPost) => Promise<boolean>;
}) {
  const [title, setTitle] = useDraft(`draft:${groupId}:title`);
  const [body, setBody] = useDraft(`draft:${groupId}:body`);
  const [kind, setKind] = useState<NewPost["kind"]>("DISCUSSION");
  const [topic, setTopic] = useState("none");
  const [picked, setPicked] = useState<Mention[]>([]);
  const ready = title.trim().length >= 3 && body.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetTitle>New post</SheetTitle>
        <SheetDescription>
          Ask a doubt or start a discussion. Type @ to mention someone.
        </SheetDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const posted = await onSubmit({
              kind,
              title: title.trim(),
              body: body.trim(),
              mentionIds: mentionedIn(body, picked).map((m) => m.id),
              subjectName: null,
              topicName: kind === "QUESTION" && topic !== "none" ? topic : null,
            });
            if (!posted) return;
            setTitle("");
            setBody("");
            setPicked([]);
            setTopic("none");
          }}
        >
          <SegmentedControl
            ariaLabel="Kind of post"
            value={kind}
            onValueChange={setKind}
            className="self-start"
            options={[
              { value: "DISCUSSION", label: "Discussion" },
              { value: "QUESTION", label: "Question" },
            ]}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-title">Title</Label>
            <Input
              id="post-title"
              value={title}
              maxLength={140}
              placeholder={
                kind === "QUESTION"
                  ? "Which article covers…?"
                  : "How many hours do you study?"
              }
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          {kind === "QUESTION" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="post-topic">Topic</Label>
              <TopicPicker
                id="post-topic"
                topics={topics}
                value={topic}
                onChange={setTopic}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-body">Details</Label>
            <MentionTextarea
              id="post-body"
              rows={5}
              maxLength={5000}
              value={body}
              onValueChange={setBody}
              members={members}
              onMention={(m) => setPicked((p) => [...p, m])}
            />
            <p className="text-small text-ink-muted">
              **bold**, *italic*, - lists, &gt; quotes and links work.
            </p>
          </div>
          <Button type="submit" variant="primary" disabled={!ready}>
            Post
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

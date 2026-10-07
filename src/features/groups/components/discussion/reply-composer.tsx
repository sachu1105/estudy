"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { mentionedIn, type Mention } from "@/lib/markdown/markdown";

import { MentionTextarea } from "./mention-textarea";
import { useDraft } from "./use-draft";

/** Write a reply; the text is kept as a draft until it's sent. */
export function ReplyComposer({
  postId,
  members,
  question,
  onSend,
}: {
  postId: string;
  members: Mention[];
  question: boolean;
  /** Resolves true once sent; the draft is cleared then. */
  onSend: (body: string, mentionIds: string[]) => Promise<boolean>;
}) {
  const [body, setBody] = useDraft(`draft:reply:${postId}`);
  const [picked, setPicked] = useState<Mention[]>([]);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const text = body.trim();
        if (!text) return;
        setBody("");
        const sent = await onSend(
          text,
          mentionedIn(text, picked).map((m) => m.id),
        );
        // Taken back: the text returns so nothing is lost.
        if (!sent) setBody(text);
        else setPicked([]);
      }}
    >
      <Label htmlFor="reply-body">
        {question ? "Your answer" : "Your reply"}
      </Label>
      <MentionTextarea
        id="reply-body"
        rows={3}
        maxLength={5000}
        value={body}
        onValueChange={setBody}
        members={members}
        onMention={(m) => setPicked((p) => [...p, m])}
        placeholder="Type @ to mention someone"
      />
      <Button
        type="submit"
        variant="primary"
        className="self-end"
        disabled={!body.trim()}
      >
        {question ? "Send answer" : "Send reply"}
      </Button>
    </form>
  );
}

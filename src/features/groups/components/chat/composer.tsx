"use client";

import { FileText, SendHorizontal, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { mentionedIn, type Mention } from "@/lib/markdown/markdown";

import { MentionTextarea } from "../discussion/mention-textarea";
import { useDraft } from "../discussion/use-draft";
import { AttachSheet, type Attachable } from "./attach-sheet";

export type Outgoing = {
  body: string;
  mentionIds: string[];
  attachment: Attachable | null;
};

/**
 * The message box at the bottom of a chat. Enter sends on a keyboard, Shift+Enter is a
 * new line; on a phone the send button sends. The draft survives a reload.
 */
export function Composer({
  channelId,
  channelName,
  members,
  attachable,
  context,
  editing,
  onCancel,
  onSubmit,
}: {
  channelId: string;
  channelName: string;
  members: Mention[];
  attachable: Attachable[];
  /** "Replying to Anu" or "Editing your message", with a way to stop. */
  context: string | null;
  /** The text being edited; replaces the draft while editing. */
  editing: string | null;
  onCancel: () => void;
  onSubmit: (out: Outgoing) => boolean;
}) {
  const [draft, setDraft] = useDraft(`chat:${channelId}`);
  const [editText, setEditText] = useState<string | null>(null);
  const [picked, setPicked] = useState<Mention[]>([]);
  const [attachment, setAttachment] = useState<Attachable | null>(null);
  // Starting (or stopping) an edit puts that text in the box.
  const [lastEditing, setLastEditing] = useState(editing);
  if (editing !== lastEditing) {
    setLastEditing(editing);
    setEditText(editing);
  }

  const text = editText ?? draft;
  const setText = editText !== null ? setEditText : setDraft;
  const ready = text.trim().length > 0 || !!attachment;

  const send = () => {
    if (!ready) return;
    const ok = onSubmit({
      body: text,
      mentionIds: mentionedIn(text, picked).map((m) => m.id),
      attachment,
    });
    if (!ok) return;
    setText("");
    setPicked([]);
    setAttachment(null);
  };

  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-bg px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] md:mx-0 md:px-0">
      {context ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-control bg-surface-muted px-3 py-1.5 text-small text-ink-muted">
          <span className="truncate">{context}</span>
          <button
            type="button"
            onClick={() => {
              setEditText(null);
              onCancel();
            }}
            aria-label="Cancel"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-chip hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}
      {attachment ? (
        <div className="mb-2 flex max-w-sm items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-small">
          <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{attachment.title}</span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            aria-label={`Remove ${attachment.title}`}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-chip text-ink-muted hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {editText === null ? (
          <AttachSheet items={attachable} onPick={setAttachment} />
        ) : null}
        <div className="min-w-0 flex-1">
          <MentionTextarea
            aria-label={`Message #${channelName}`}
            placeholder={`Message #${channelName}`}
            rows={1}
            maxLength={2000}
            listAbove
            value={text}
            onValueChange={setText}
            members={members}
            onMention={(p) => setPicked((all) => [...all, p])}
            onKeyDown={(e) => {
              const keyboard = window.matchMedia("(pointer: fine)").matches;
              if (e.key === "Enter" && !e.shiftKey && keyboard) {
                e.preventDefault();
                send();
              }
              if (e.key === "Escape" && context) onCancel();
            }}
            className="max-h-40 min-h-11 resize-none py-2.5"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="icon"
          aria-label={editText !== null ? "Save edit" : "Send"}
          disabled={!ready}
        >
          <SendHorizontal aria-hidden />
        </Button>
      </form>
    </div>
  );
}

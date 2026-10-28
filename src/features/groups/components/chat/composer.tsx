"use client";

import { CircleHelp, FileText, SendHorizontal, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { mentionedIn, type Mention } from "@/lib/markdown/markdown";

import { MentionTextarea } from "../discussion/mention-textarea";
import { useDraft } from "../discussion/use-draft";
import { AttachPanel } from "./attach-panel";
import type { Attachable } from "./attachable";
import { checkFiles, PendingFiles } from "./chat-files";

export type Outgoing = {
  body: string;
  mentionIds: string[];
  attachment: Attachable | null;
  /** Photos or a PDF from the device; never alongside `attachment`. */
  files: File[];
  /** A doubt for others to answer; the words are the question. */
  doubt: boolean;
  /** A poll: the words are its question, these its choices. */
  pollOptions?: string[];
};

/**
 * The message box at the bottom of a chat. Enter sends on a keyboard, Shift+Enter is a
 * new line; on a phone the send button sends. The draft survives a reload. Everything
 * else a message can be (photos, a PDF, pod material, a test, a poll, a doubt) is behind
 * the paperclip.
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
  onTest,
  onPoll,
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
  onTest: () => void;
  onPoll: () => void;
}) {
  const [draft, setDraft] = useDraft(`chat:${channelId}`);
  const [editText, setEditText] = useState<string | null>(null);
  const [picked, setPicked] = useState<Mention[]>([]);
  const [attachment, setAttachment] = useState<Attachable | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [doubt, setDoubt] = useState(false);
  // One kind of attachment at a time: a pod item, or files from the device.
  const addFiles = (more: File[]) => {
    const next = [...files, ...more];
    const problem = checkFiles(next);
    if (problem) return void toast.error(problem);
    setAttachment(null);
    setFiles(next);
  };
  // Starting (or stopping) an edit puts that text in the box.
  const [lastEditing, setLastEditing] = useState(editing);
  if (editing !== lastEditing) {
    setLastEditing(editing);
    setEditText(editing);
  }

  const text = editText ?? draft;
  const setText = editText !== null ? setEditText : setDraft;
  const ready =
    text.trim().length > 0 || (!doubt && (!!attachment || files.length > 0));

  const send = () => {
    if (!ready) return;
    const ok = onSubmit({
      body: text,
      mentionIds: mentionedIn(text, picked).map((m) => m.id),
      attachment,
      files,
      doubt,
    });
    if (!ok) return;
    setText("");
    setPicked([]);
    setAttachment(null);
    setFiles([]);
    setDoubt(false);
  };

  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-bg px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] md:mx-0 md:px-0">
      {context ? (
        <Pill
          label="Cancel"
          onRemove={() => {
            setEditText(null);
            onCancel();
          }}
        >
          {context}
        </Pill>
      ) : null}
      {doubt ? (
        <Pill label="Not a doubt" onRemove={() => setDoubt(false)}>
          <CircleHelp className="size-4 shrink-0 text-accent" aria-hidden />
          Asking a doubt: others answer by replying
        </Pill>
      ) : null}
      {attachment ? (
        <Pill
          label={`Remove ${attachment.title}`}
          onRemove={() => setAttachment(null)}
        >
          <FileText className="size-4 shrink-0" aria-hidden />
          {attachment.title}
        </Pill>
      ) : null}
      {files.length ? (
        <PendingFiles
          files={files}
          onRemove={(f) => setFiles((all) => all.filter((x) => x !== f))}
        />
      ) : null}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {editText === null ? (
          <AttachPanel
            attachable={attachable}
            onFiles={addFiles}
            onPod={(item) => {
              setFiles([]);
              setAttachment(item);
            }}
            onTest={onTest}
            onPoll={onPoll}
            onDoubt={() => setDoubt(true)}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <MentionTextarea
            aria-label={`Message #${channelName}`}
            placeholder={doubt ? "Ask your doubt" : `Message #${channelName}`}
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
            className="block max-h-40 min-h-11 resize-none py-2.25 leading-6"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="icon"
          className="md:size-11"
          aria-label={editText !== null ? "Save edit" : "Send"}
          disabled={!ready}
        >
          <SendHorizontal aria-hidden />
        </Button>
      </form>
    </div>
  );
}

/** A line above the box saying what's about to happen, with a way out. */
function Pill({
  children,
  label,
  onRemove,
}: {
  children: ReactNode;
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 rounded-control bg-surface-muted py-1 pr-1 pl-3 text-small text-ink-muted">
      <span className="flex min-w-0 items-center gap-2 truncate">
        {children}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={label}
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-chip hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

"use client";

import { SendHorizontal, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/input";
import { DM_MAX } from "@/lib/friends/pair";
import { cn } from "@/lib/utils/cn";

import { useDraft } from "@/features/groups/components/discussion/use-draft";

/**
 * The box at the bottom of a direct chat. Enter sends on a keyboard, Shift+Enter is a
 * new line; on a phone the button sends. The draft survives a reload.
 */
export function DmComposer({
  userId,
  name,
  editing,
  onCancelEdit,
  onSubmit,
}: {
  userId: string;
  /** Who it goes to, for the placeholder. */
  name: string;
  /** The text being edited; replaces the draft while editing. */
  editing: string | null;
  onCancelEdit: () => void;
  onSubmit: (body: string) => boolean;
}) {
  const [draft, setDraft] = useDraft(`dm:${userId}`);
  const [editText, setEditText] = useState<string | null>(null);
  const [lastEditing, setLastEditing] = useState(editing);
  if (editing !== lastEditing) {
    setLastEditing(editing);
    setEditText(editing);
  }
  const text = editText ?? draft;
  const setText = editText !== null ? setEditText : setDraft;
  const ready = text.trim().length > 0;

  const send = () => {
    if (!ready || !onSubmit(text)) return;
    setText("");
    setEditText(null);
  };
  const cancel = () => {
    setEditText(null);
    onCancelEdit();
  };

  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-bg px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] md:mx-0 md:px-0">
      {editText !== null ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-control bg-surface-muted py-1 pr-1 pl-3 text-small text-ink-muted">
          Editing your message
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-chip hover:text-ink"
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
        <textarea
          aria-label={`Message ${name}`}
          placeholder={`Message ${name}`}
          rows={1}
          maxLength={DM_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            const keyboard = window.matchMedia("(pointer: fine)").matches;
            if (e.key === "Enter" && !e.shiftKey && keyboard) {
              e.preventDefault();
              send();
            }
            if (e.key === "Escape" && editText !== null) cancel();
          }}
          className={cn(
            fieldClasses,
            "block [field-sizing:content] max-h-40 min-h-11 min-w-0 flex-1 resize-none py-2.25 leading-6",
          )}
        />
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

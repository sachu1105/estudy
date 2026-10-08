"use client";

import {
  HeartHandshake,
  Lightbulb,
  MoreHorizontal,
  Pencil,
  Reply,
  ThumbsUp,
  Trash2,
  Flag,
} from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PendingMessage, Reaction } from "@/lib/squads/chat-types";

import { ReportDialog } from "../report-dialog";

export const REACTIONS = {
  LIKE: { icon: ThumbsUp, label: "Like" },
  HELPFUL: { icon: Lightbulb, label: "Helpful" },
  THANKS: { icon: HeartHandshake, label: "Thanks" },
} as const;

/** What can be done with one message: react, reply, edit or delete it, report it. */
export function MessageMenu({
  groupId,
  message,
  canReply,
  onReact,
  onReply,
  onEdit,
  onDelete,
}: {
  groupId: string;
  message: PendingMessage;
  canReply: boolean;
  onReact: (kind: Reaction) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [reporting, setReporting] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`More for the message from ${message.author.displayName}`}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-chip text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:size-8"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(Object.keys(REACTIONS) as Reaction[]).map((kind) => {
            const { icon: Icon, label } = REACTIONS[kind];
            const mine = message.reactions.find((r) => r.kind === kind)?.mine;
            return (
              <DropdownMenuItem key={kind} onSelect={() => onReact(kind)}>
                <Icon aria-hidden />{" "}
                {mine ? `Take back ${label.toLowerCase()}` : label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          {canReply ? (
            <DropdownMenuItem onSelect={onReply}>
              <Reply aria-hidden /> Reply
            </DropdownMenuItem>
          ) : null}
          {message.mine ? (
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil aria-hidden /> Edit message
            </DropdownMenuItem>
          ) : null}
          {message.canDelete ? (
            <DropdownMenuItem onSelect={onDelete}>
              <Trash2 aria-hidden /> Delete message
            </DropdownMenuItem>
          ) : null}
          {message.mine ? null : (
            <DropdownMenuItem onSelect={() => setReporting(true)}>
              <Flag aria-hidden /> Report message
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        open={reporting}
        onOpenChange={setReporting}
        target={{ type: "MESSAGE", id: message.id, groupId }}
        what="this message"
      />
    </>
  );
}

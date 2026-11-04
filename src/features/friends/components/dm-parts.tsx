"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Person = {
  displayName: string;
  avatarUrl: string | null;
  handle: string | null;
};

/** The top of a chat, as in Discord: who it's with, large. */
export function Start({ person }: { person: Person }) {
  return (
    <div className="flex flex-col items-start gap-2 pt-6 pb-2">
      <Avatar name={person.displayName} src={person.avatarUrl} size="lg" />
      <p className="font-heading text-h1 font-semibold">{person.displayName}</p>
      {person.handle ? (
        <p className="text-body text-ink-muted">@{person.handle}</p>
      ) : null}
      <p className="text-body text-ink-muted">
        This is the start of your chat with {person.displayName}. Only the two
        of you can read it.
      </p>
    </div>
  );
}

export function DmMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More for your message"
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-chip text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:size-8"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden /> Edit message
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete}>
          <Trash2 aria-hidden /> Delete message
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

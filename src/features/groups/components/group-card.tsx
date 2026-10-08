import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { joinModeOf, type JoinMode } from "@/lib/squads/access";

const JOIN_LABEL: Record<JoinMode, string> = {
  OPEN: "Open",
  REQUEST: "Asks to join",
  INVITE_ONLY: "Invite only",
};

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 1
      ? words[0]![0]! + words[1]![0]!
      : (words[0] ?? "?").slice(0, 2)
  ).toUpperCase();
}

/**
 * A squad at a glance: its exam, size, how to get in, and the viewer's role. The whole
 * card opens the squad; an action (Join) sits on top of it.
 */
export function GroupCard({
  group,
  role,
  unread = false,
  action,
}: {
  group: {
    id: string;
    name: string;
    description: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    joinMode: JoinMode;
    exam: { name: string } | null;
    _count: { members: number };
  };
  role?: "OWNER" | "ADMIN" | "MEMBER" | null;
  /** Something new in its chats. */
  unread?: boolean;
  action?: ReactNode;
}) {
  const facts = [
    group.exam?.name,
    `${group._count.members} member${group._count.members === 1 ? "" : "s"}`,
    role ? null : JOIN_LABEL[joinModeOf(group)],
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="relative flex w-full items-start gap-3 rounded-card border border-border bg-surface p-4 transition-[transform,box-shadow] duration-[120ms] focus-within:ring-2 focus-within:ring-accent hover:-translate-y-px hover:shadow-md">
      <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-surface-muted font-heading text-small font-medium text-ink-muted">
        {initials(group.name)}
        {unread ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-ink"
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Link
            href={`/groups/${group.id}`}
            className="font-heading text-h3 font-medium break-words outline-none after:absolute after:inset-0 after:rounded-card"
          >
            {group.name}
            {unread ? <span className="sr-only">, new messages</span> : null}
          </Link>
          {group.visibility === "PRIVATE" ? (
            <Badge tone="outline">
              <Lock aria-hidden /> private
            </Badge>
          ) : null}
          {role && role !== "MEMBER" ? (
            <Badge tone="accent">{role.toLowerCase()}</Badge>
          ) : null}
        </span>
        <span className="text-small text-ink-muted">{facts}</span>
        {group.description ? (
          <span className="line-clamp-2 text-small text-ink-muted">
            {group.description}
          </span>
        ) : null}
      </span>
      {action ? (
        <span className="relative z-10 shrink-0 self-center">{action}</span>
      ) : (
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-ink-muted"
          aria-hidden
        />
      )}
    </div>
  );
}

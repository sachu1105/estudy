import { ChevronRight, Lock, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

/** A group at a glance: its exam, size, and the viewer's role in it. */
export function GroupCard({
  group,
  role,
}: {
  group: {
    id: string;
    name: string;
    description: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    exam: { name: string } | null;
    _count: { members: number };
  };
  role?: "OWNER" | "ADMIN" | "MEMBER" | null;
}) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="flex w-full items-start gap-3 rounded-card border border-border bg-surface p-4 transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
        <Users className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-h3 font-medium break-words">
            {group.name}
          </span>
          {group.visibility === "PRIVATE" ? (
            <Badge tone="outline">
              <Lock aria-hidden /> private
            </Badge>
          ) : null}
          {role && role !== "MEMBER" ? (
            <Badge tone="accent">{role.toLowerCase()}</Badge>
          ) : null}
        </span>
        <span className="text-small text-ink-muted">
          {[
            group.exam?.name,
            `${group._count.members} member${group._count.members === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {group.description ? (
          <span className="line-clamp-2 text-small text-ink-muted">
            {group.description}
          </span>
        ) : null}
      </span>
      <ChevronRight
        className="mt-1 size-4 shrink-0 text-ink-muted"
        aria-hidden
      />
    </Link>
  );
}

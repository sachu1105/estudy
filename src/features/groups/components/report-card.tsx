"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { GroupRole } from "@/lib/squads/roles";

import { decideSquadReportAction } from "../actions";
import { MemberMenu } from "./member-menu";

const REASONS: Record<string, string> = {
  spam: "Spam",
  abuse: "Abuse",
  copyright: "Copyright",
  wrong: "Wrong",
  other: "Other",
};

export type SquadReport = {
  type: string;
  id: string;
  label: string;
  excerpt: string | null;
  href: string;
  hidden: boolean;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: GroupRole;
    muted: boolean;
  } | null;
  reasons: { reason: string; count: number }[];
  notes: string[];
  count: number;
  /** "3 h ago", worked out on the server. */
  when: string;
};

/**
 * One reported thing: what it is, why people flagged it (never who), the person behind
 * it with the usual ways to mute or remove them, and what to do about it.
 */
export function ReportCard({
  groupId,
  report: r,
  canSetRole,
  canSetAdmin,
}: {
  groupId: string;
  report: SquadReport;
  canSetRole: boolean;
  canSetAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const person = r.type === "USER";
  const decide = (decision: "remove" | "resolve" | "dismiss", done: string) =>
    start(async () => {
      const result = await decideSquadReportAction({
        groupId,
        type: r.type,
        targetId: r.id,
        decision,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(done);
      router.refresh();
    });

  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
          <Flag className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {person ? (
            <span className="text-body font-medium">
              {r.author?.name ?? "Someone who left"}
            </span>
          ) : (
            <Link
              href={r.href}
              className="text-body font-medium break-words text-accent-ink hover:underline"
            >
              {r.label}
            </Link>
          )}
          <span className="text-small text-ink-muted">
            {r.count} report{r.count === 1 ? "" : "s"} · {r.when}
            {r.hidden ? " · already hidden" : ""}
          </span>
        </div>
      </div>

      {r.excerpt ? (
        <blockquote className="rounded-chip bg-surface-muted p-3 text-small break-words whitespace-pre-wrap">
          {r.excerpt}
        </blockquote>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {r.reasons.map((x) => (
          <Badge key={x.reason} tone="outline">
            {REASONS[x.reason] ?? x.reason}
            {x.count > 1 ? ` ×${x.count}` : ""}
          </Badge>
        ))}
      </div>
      {r.notes.length ? (
        <ul className="flex flex-col gap-1 text-small text-ink-muted">
          {r.notes.map((n, i) => (
            <li key={i} className="break-words">
              “{n}”
            </li>
          ))}
        </ul>
      ) : null}

      {/* The person behind it, with the usual ways to mute or remove them. */}
      {r.author && !person ? (
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Avatar
            name={r.author.name}
            src={r.author.avatarUrl ?? undefined}
            size="sm"
          />
          <span className="min-w-0 flex-1 truncate text-small">
            By {r.author.name}
            {r.author.muted ? " · muted" : ""}
          </span>
          <MemberMenu
            groupId={groupId}
            member={r.author}
            canManage
            canSetRole={canSetRole}
            canSetAdmin={canSetAdmin}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {!person && !r.hidden ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => decide("remove", "Taken down")}
          >
            Take it down
          </Button>
        ) : (
          <>
            {person && r.author ? (
              <MemberMenu
                groupId={groupId}
                member={r.author}
                canManage
                canSetRole={canSetRole}
                canSetAdmin={canSetAdmin}
              />
            ) : null}
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => decide("resolve", "Marked handled")}
            >
              Mark handled
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => decide("dismiss", "Dismissed")}
        >
          Dismiss
        </Button>
      </div>
    </li>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { groupTests } from "@/server/services/groups";

export const metadata: Metadata = { title: "Squad rank" };

/** This week among the members: XP from studying, and right answers in group tests. */
export default async function GroupRank({
  params,
}: PageProps<"/groups/[groupId]/rank">) {
  const user = await requireUser();
  const { groupId } = await params;
  const rows = isId(groupId) ? await groupTests.rank(user, groupId) : null;
  if (!rows) notFound();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-ink-muted">This week, Monday to Sunday.</p>
      <div className="flex justify-end gap-6 px-3 text-micro text-ink-muted uppercase">
        <span className="w-20 text-right">Test answers</span>
        <span className="w-16 text-right">XP</span>
      </div>
      <ol className="divide-y divide-border rounded-card border border-border bg-surface">
        {rows.map((r, i) => (
          <li
            key={r.user.id}
            className={`flex items-center gap-3 px-3 py-2 ${r.you ? "bg-accent-soft" : ""}`}
          >
            <span className="w-8 text-right font-mono text-body text-ink-muted tabular-nums">
              {i + 1}
            </span>
            <Avatar
              name={r.user.displayName}
              src={r.user.avatarUrl ?? undefined}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate text-body">
              {r.user.displayName}
              {r.you ? " (you)" : ""}
            </span>
            <span className="w-20 text-right font-mono text-body tabular-nums">
              {r.correct}
            </span>
            <span className="w-16 text-right font-mono text-body tabular-nums">
              {r.xp}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

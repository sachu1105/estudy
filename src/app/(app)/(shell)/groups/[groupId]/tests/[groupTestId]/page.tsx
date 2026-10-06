import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { BackLink } from "@/features/pods/components/back-link";
import { TakeGroupTest } from "@/features/groups/components/group-test-controls";
import { isId } from "@/lib/ids";
import { formatMinutes } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { groupTests } from "@/server/services/groups";

export const metadata: Metadata = { title: "Test results" };

/** How the members did on one shared test, best score first. */
export default async function GroupTestResults({
  params,
}: PageProps<"/groups/[groupId]/tests/[groupTestId]">) {
  const user = await requireUser();
  const { groupId, groupTestId } = await params;
  const data =
    isId(groupId) && isId(groupTestId)
      ? await groupTests.results(user, groupId, groupTestId)
      : null;
  if (!data) notFound();
  const took = data.rows.some((r) => r.user.id === user.id);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/groups/${groupId}/tests`} label="Tests" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h2 break-words">{data.test.title}</h2>
        {took ? null : (
          <TakeGroupTest
            groupId={groupId}
            groupTestId={groupTestId}
            label="Take it now"
          />
        )}
      </div>
      {data.rows.length === 0 ? (
        <p className="text-body text-ink-muted">Nobody has taken it yet.</p>
      ) : (
        <ol className="divide-y divide-border rounded-card border border-border bg-surface">
          {data.rows.map((r, i) => (
            <li
              key={r.id}
              className={`flex items-center gap-3 px-3 py-2 ${r.user.id === user.id ? "bg-accent-soft" : ""}`}
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
                {r.user.id === user.id ? " (you)" : ""}
              </span>
              <span className="text-small text-ink-muted">
                {formatMinutes(Math.max(1, Math.round(r.durationSec / 60)))}
              </span>
              <span className="w-20 text-right font-mono text-body tabular-nums">
                {r.correct}/{r.total}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

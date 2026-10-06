import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { BuildTestDialog } from "@/features/groups/components/build-test-dialog";
import { ReportButton } from "@/features/groups/components/report-button";
import {
  ShareTestSheet,
  TakeGroupTest,
} from "@/features/groups/components/group-test-controls";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { groupService, groupTests } from "@/server/services/groups";
import { podService } from "@/server/services/pods";
import { testService } from "@/server/services/tests";

export const metadata: Metadata = { title: "Group tests" };

/** Tests the members shared: take one, then see how everyone did. */
export default async function GroupTestsPage({
  params,
}: PageProps<"/groups/[groupId]/tests">) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!isId(groupId)) notFound();
  const [view, tests, history, pods] = await Promise.all([
    groupService.view(user, groupId),
    groupTests.list(user, groupId),
    testService.history(user),
    podService.list(user),
  ]);
  if (!view?.role || !tests) return null;
  const topics = [
    ...new Set(pods.flatMap((p) => p.topics.map((t) => t.name))),
  ].sort();
  const mine = [
    ...new Map(
      history.map((a) => [
        a.mockTestId,
        { mockTestId: a.mockTestId, title: a.mockTest.title },
      ]),
    ).values(),
  ];

  return (
    <div className="flex flex-col gap-4">
      {view.muted ? null : (
        <div className="flex flex-wrap gap-2">
          <BuildTestDialog groupId={groupId} topics={topics} />
          <ShareTestSheet groupId={groupId} tests={mine} />
        </div>
      )}
      {tests.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No tests yet"
          description="Build one from the question pool, or share a test you took, and see how everyone does."
        />
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {tests.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body font-medium break-words">
                  {t.title}
                </span>
                <span className="text-small text-ink-muted">
                  {t.count} questions
                  {t.durationSec
                    ? `, ${Math.round(t.durationSec / 60)} min`
                    : ""}{" "}
                  · shared by {t.sharedBy.displayName}
                  {t.mine
                    ? ` · you scored ${t.mine.correct} of ${t.mine.total}`
                    : ""}
                </span>
              </span>
              <Link
                href={`/groups/${groupId}/tests/${t.id}`}
                className="text-small font-medium text-accent-ink hover:underline"
              >
                Results
              </Link>
              <ReportButton
                target={{ type: "GROUP_TEST", id: t.id, groupId }}
                what={t.title}
              />
              {t.mine ? null : (
                <TakeGroupTest
                  groupId={groupId}
                  groupTestId={t.id}
                  label="Take test"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

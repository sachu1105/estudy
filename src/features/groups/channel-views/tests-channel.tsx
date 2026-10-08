import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { groupTests } from "@/server/services/groups";
import { podService } from "@/server/services/pods";
import { testService } from "@/server/services/tests";

import { BuildTestDialog } from "../components/build-test-dialog";
import { ChannelHeader } from "../components/channels/channel-header";
import {
  ShareTestSheet,
  TakeGroupTest,
} from "../components/group-test-controls";
import { ReportButton } from "../components/report-button";
import type { ChannelViewProps } from "./types";

/** A tests channel: take one, then see how everyone did. */
export async function TestsChannel({
  user,
  groupId,
  channel,
  canPost,
  manage,
  notify,
}: ChannelViewProps) {
  const [tests, history, pods] = await Promise.all([
    groupTests.list(user, groupId, channel.id),
    canPost ? testService.history(user) : Promise.resolve([]),
    canPost ? podService.list(user) : Promise.resolve([]),
  ]);
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
    <>
      <ChannelHeader
        manage={manage}
        notify={notify}
        groupId={groupId}
        channel={channel}
        actions={
          canPost ? (
            <>
              <BuildTestDialog
                groupId={groupId}
                channelId={channel.id}
                topics={topics}
              />
              <ShareTestSheet
                groupId={groupId}
                channelId={channel.id}
                tests={mine}
              />
            </>
          ) : null
        }
      />
      {!tests || tests.length === 0 ? (
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
    </>
  );
}

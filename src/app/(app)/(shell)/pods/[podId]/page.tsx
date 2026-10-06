import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BackLink } from "@/features/pods/components/back-link";
import { MaterialPanel } from "@/features/pods/components/material-panel";
import { PodMenu } from "@/features/pods/components/pod-menu";
import { PodTabs } from "@/features/pods/components/pod-tabs";
import { TopicChecklist } from "@/features/pods/components/topic-checklist";
import { PodTests } from "@/features/tests/components/pod-tests";
import { isId } from "@/lib/ids";
import { formatDay, formatMinutes } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { itemService, podService } from "@/server/services/pods";
import { progressService } from "@/server/services/progress";
import { testService } from "@/server/services/tests";

export const metadata: Metadata = { title: "Pod" };

export default async function PodPage({ params }: PageProps<"/pods/[podId]">) {
  const user = await requireUser();
  const { podId } = await params;
  const pod = isId(podId) ? await podService.get(user, podId) : null;
  if (!pod) notFound();
  const [items, stats, attempts] = await Promise.all([
    itemService.list(user, pod.id),
    pod.subjectId
      ? progressService.subjectStats(user, pod.subjectId)
      : { minutes: 0, tasksDone: 0, lastStudied: null },
    pod.subjectId
      ? testService.history(user, { subjectId: pod.subjectId })
      : [],
  ]);

  const done = pod.topics.filter((t) => t.done).length;
  const total = pod.topics.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <>
      {pod.syllabus ? (
        <BackLink
          href={`/pods/exam/${pod.syllabus.id}`}
          label={pod.syllabus.title}
        />
      ) : (
        <BackLink href="/pods" label="Pods" />
      )}
      <PageHeader
        title={pod.name}
        actions={
          pod.kind === "CUSTOM" ? (
            <PodMenu podId={pod.id} name={pod.name} />
          ) : null
        }
      />

      {total > 0 ? (
        <div className="mb-6 flex items-center gap-4 rounded-card border border-border bg-surface p-4">
          <ProgressRing
            value={percent}
            size={72}
            strokeWidth={7}
            label={`${pod.name} progress`}
          />
          <div className="flex flex-col gap-0.5">
            <p className="font-heading text-h3 font-medium">
              {done} of {total} topics done
            </p>
            <p className="text-small text-ink-muted">
              {pod.items} item{pod.items === 1 ? "" : "s"} of material
            </p>
          </div>
        </div>
      ) : null}

      <PodTabs
        hasTopics={total > 0}
        topics={
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body text-ink-muted">
                Tick a topic when you&apos;ve covered it. Open one to see and
                add its material.
              </p>
              {pod.subjectId && pod.syllabus ? (
                <Button asChild variant="secondary">
                  <Link
                    href={`/syllabus/${pod.syllabus.id}/subjects/${pod.subjectId}`}
                  >
                    <Pencil aria-hidden /> Edit topics
                  </Link>
                </Button>
              ) : null}
            </div>
            <TopicChecklist podId={pod.id} topics={pod.topics} />
          </div>
        }
        material={
          <MaterialPanel
            podId={pod.id}
            items={items}
            splitUnlinked={total > 0}
          />
        }
        tests={<PodTests subjectId={pod.subjectId} attempts={attempts} />}
        progress={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Topics done", total ? `${done} of ${total}` : "No topics"],
              ["Time studied", formatMinutes(stats.minutes)],
              ["Plan tasks done", String(stats.tasksDone)],
              [
                "Last studied",
                stats.lastStudied
                  ? formatDay(stats.lastStudied, false)
                  : "Not yet",
              ],
              ["Material", String(pod.items)],
              ["Tests taken", "0"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-card border border-border bg-surface p-4"
              >
                <p className="text-small text-ink-muted">{label}</p>
                <p className="font-heading text-h2">{value}</p>
              </div>
            ))}
          </div>
        }
      />
    </>
  );
}

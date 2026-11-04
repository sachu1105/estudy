import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PodCover } from "@/components/blocks/pod-cover";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BackLink } from "@/features/pods/components/back-link";
import { MaterialPanel } from "@/features/pods/components/material-panel";
import { PodMenu } from "@/features/pods/components/pod-menu";
import { PodTabs } from "@/features/pods/components/pod-tabs";
import { TopicChecklist } from "@/features/pods/components/topic-checklist";
import { isId } from "@/lib/ids";
import { formatDay, formatMinutes } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { parseStoredCover, selectionOf } from "@/lib/pods/covers";
import { coverService, itemService, podService } from "@/server/services/pods";
import { progressService } from "@/server/services/progress";

export const metadata: Metadata = { title: "Pod" };

export default async function PodPage({ params }: PageProps<"/pods/[podId]">) {
  const user = await requireUser();
  const { podId } = await params;
  const pod = isId(podId) ? await podService.get(user, podId) : null;
  if (!pod) notFound();
  const [items, stats, cover] = await Promise.all([
    itemService.list(user, pod.id),
    pod.subjectId
      ? progressService.subjectStats(user, pod.subjectId)
      : { minutes: 0, tasksDone: 0, lastStudied: null },
    coverService.resolve(pod.cover, pod.id),
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
            <PodMenu
              podId={pod.id}
              name={pod.name}
              cover={{
                selection: selectionOf(parseStoredCover(pod.cover)),
                view: cover,
              }}
            />
          ) : null
        }
      />

      {total > 0 ? (
        // The pod's cover on top, like its card on the pods pages, so the page reads as
        // the same pod you opened.
        <div className="mb-6 overflow-hidden rounded-card border border-border bg-surface">
          <PodCover cover={cover} className="h-12 sm:h-14" />
          <div className="flex items-end gap-4 px-4 pt-3 pb-4">
            <ProgressRing
              value={percent}
              size={72}
              strokeWidth={7}
              label={`${pod.name} progress`}
              className="-mt-12 rounded-full bg-surface ring-4 ring-surface"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="font-heading text-h3 font-medium">
                {done} of {total} topics done
              </p>
              <p className="text-small text-ink-muted">
                {pod.items} item{pod.items === 1 ? "" : "s"} of material
                {stats.minutes > 0
                  ? ` · ${formatMinutes(stats.minutes)} studied`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <PodTabs
        hasTopics={total > 0}
        topics={
          <TopicChecklist
            podId={pod.id}
            topics={pod.topics}
            action={
              pod.subjectId && pod.syllabus ? (
                // Icon only on a phone, so it shares the row with the filter.
                <Button
                  asChild
                  variant="secondary"
                  className="max-sm:w-11 max-sm:px-0"
                >
                  <Link
                    href={`/syllabus/${pod.syllabus.id}/subjects/${pod.subjectId}`}
                    aria-label="Edit topics"
                  >
                    <Pencil aria-hidden />
                    <span className="max-sm:sr-only">Edit topics</span>
                  </Link>
                </Button>
              ) : null
            }
          />
        }
        material={
          <MaterialPanel
            podId={pod.id}
            items={items}
            splitUnlinked={total > 0}
          />
        }
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

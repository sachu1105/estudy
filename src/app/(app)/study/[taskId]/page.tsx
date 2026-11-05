import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { taskTitle, whyThis } from "@/features/plans/task-text";
import { FocusTimer } from "@/features/study/components/focus-timer";
import { MaterialSheet } from "@/features/study/components/material-sheet";
import { WhySheet } from "@/features/study/components/why-sheet";
import { isId } from "@/lib/ids";
import type { TaskReason } from "@/lib/plan-engine";
import { requireUser } from "@/server/auth/session";
import { itemService } from "@/server/services/pods";
import { progressService } from "@/server/services/progress";

export const metadata: Metadata = { title: "Study session" };

const KIND = {
  NOTE: "Note",
  LINK: "Link",
  FILE: "PDF",
  IMAGE: "Photos",
} as const;

export default async function StudyPage({
  params,
}: PageProps<"/study/[taskId]">) {
  const user = await requireUser();
  const { taskId } = await params;
  const task = isId(taskId) ? await progressService.task(user, taskId) : null;
  if (!task) notFound();
  const subject = task.subjectName ?? "Your task";
  const topic = task.topicName ?? "Topic";
  const title = taskTitle(task, topic, subject);

  if (!task.active || task.done)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1>{title}</h1>
        <p className="text-body text-ink-muted">
          {task.done
            ? "This one is already done."
            : "This task belongs to a plan that has been replaced."}
        </p>
        <Button asChild variant="primary">
          <Link href="/today">Back to today</Link>
        </Button>
      </div>
    );

  const items = task.topicId
    ? await itemService.listForTopic(user, task.topicId)
    : [];
  const why = whyThis(task.reason as TaskReason, subject);

  return (
    <div className="flex flex-1 flex-col md:justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex flex-col gap-1">
          <p className="text-small text-ink-muted">{subject}</p>
          <h1 className="text-balance break-words">{title}</h1>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {task.topicId ? (
            <MaterialSheet
              topicName={topic}
              podHref={`/pods/topic/${task.topicId}`}
              items={items.map((i) => ({
                id: i.id,
                title: i.title,
                detail: KIND[i.type],
                href: `/pods/${i.podId}/items/${i.id}`,
              }))}
            />
          ) : null}
          {why.length > 0 ? <WhySheet lines={why} /> : null}
        </div>
      </div>
      <FocusTimer taskId={task.id} plannedMinutes={task.minutes} />
    </div>
  );
}

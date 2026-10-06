import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { MaterialPanel } from "@/features/pods/components/material-panel";
import { TopicDoneToggle } from "@/features/pods/components/topic-done-toggle";
import { TopicPlan } from "@/features/plans/components/topic-plan";
import { StartTestButton } from "@/features/tests/components/start-test-button";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { itemService, podService } from "@/server/services/pods";
import { progressService } from "@/server/services/progress";

export const metadata: Metadata = { title: "Topic" };

// One topic of a pod: whether it's done, and everything linked to it.
export default async function TopicPage({
  params,
}: PageProps<"/pods/[podId]/topics/[topicId]">) {
  const user = await requireUser();
  const { podId, topicId } = await params;
  const pod = isId(podId) ? await podService.get(user, podId) : null;
  const topic = pod?.topics.find((t) => t.id === topicId);
  if (!pod || !topic) notFound();
  const [items, planned] = await Promise.all([
    itemService.listForTopic(user, topic.id),
    progressService.topicPlan(user, topic.id),
  ]);

  return (
    <>
      <Link
        href={`/pods/${pod.id}`}
        className="mb-3 -ml-1 inline-flex min-h-11 items-center gap-1 text-small font-medium text-ink-muted hover:text-ink md:min-h-0"
      >
        <ChevronLeft className="size-4" aria-hidden /> {pod.name}
      </Link>
      <PageHeader title={topic.name} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <TopicDoneToggle podId={pod.id} topicId={topic.id} done={topic.done} />
        <Badge tone="outline">Weight {topic.weight}</Badge>
        <Badge tone="outline">Difficulty {topic.difficulty}</Badge>
        {topic.foundational ? <Badge tone="accent">Foundation</Badge> : null}
        <StartTestButton
          kind="topic"
          id={topic.id}
          label="Practice 5 questions"
        />
      </div>
      <TopicPlan tasks={planned} topic={topic.name} subject={pod.name} />
      <MaterialPanel podId={pod.id} items={items} topicIds={[topic.id]} />
    </>
  );
}

import { notFound, redirect } from "next/navigation";

import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { podService } from "@/server/services/pods";

// "Open pod" on a plan task: the topic inside its subject pod, one tap away.
export default async function TopicPodRedirect({
  params,
}: PageProps<"/pods/topic/[topicId]">) {
  const user = await requireUser();
  const { topicId } = await params;
  const podId = isId(topicId)
    ? await podService.podIdForTopic(user, topicId)
    : null;
  if (!podId) notFound();
  redirect(`/pods/${podId}/topics/${topicId}`);
}

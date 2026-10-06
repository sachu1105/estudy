import { notFound, redirect } from "next/navigation";

import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { podService } from "@/server/services/pods";

// A subject card links here; it opens that subject's pod (creating it if needed).
export default async function SubjectPodRedirect({
  params,
}: PageProps<"/pods/subject/[subjectId]">) {
  const user = await requireUser();
  const { subjectId } = await params;
  const podId = isId(subjectId)
    ? await podService.podIdForSubject(user, subjectId)
    : null;
  if (!podId) notFound();
  redirect(`/pods/${podId}`);
}

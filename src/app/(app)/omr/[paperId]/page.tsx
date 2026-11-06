import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OmrWorkspace } from "@/features/omr/components/omr-workspace";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Answer sheet" };

export default async function OmrPage({ params }: PageProps<"/omr/[paperId]">) {
  const user = await requireUser();
  const { paperId } = await params;
  const opened = isId(paperId) ? await omrService.get(user, paperId) : null;
  if (!opened) notFound();
  const { paper } = opened;
  return (
    <OmrWorkspace
      key={paper.id}
      paper={{
        id: paper.id,
        title: paper.title,
        shape: paper.shape,
        marking: paper.marking,
        limitMin: paper.limitMin,
        keyed: paper.keyed,
      }}
      initialMarks={opened.marks}
      initialTimer={opened.timer}
    />
  );
}

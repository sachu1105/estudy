import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { BackLink } from "@/features/pods/components/back-link";
import { ParseStatus } from "@/features/syllabus/components/parse-status";
import { RereadNote } from "@/features/syllabus/components/reread-note";
import { SubjectsBoard } from "@/features/syllabus/components/subjects-board";
import { DeleteSyllabusButton } from "@/features/syllabus/components/syllabus-actions";
import { syllabusState } from "@/features/syllabus/state";
import { toEditableTree } from "@/features/syllabus/to-tree";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import {
  canReadAgain,
  jobService,
  reviewService,
} from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Syllabus" };

export default async function SyllabusVersionPage({
  params,
}: PageProps<"/syllabus/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const version = isId(id) ? await reviewService.get(user, id) : null;
  if (!version) notFound();

  const state = syllabusState(version);
  const job = version.parseJobs[0];
  const subtitle = version.exam?.name ?? version.sourceName ?? undefined;

  if ((state === "reading" || state === "failed") && job) {
    return (
      <div className="mx-auto max-w-xl">
        <BackLink href="/pods" label="Pods" />
        <PageHeader title={version.title} description={subtitle} />
        <ParseStatus
          versionId={version.id}
          readerOnline={await jobService.readerOnline()}
          job={{
            id: job.id,
            status: job.status,
            stage: job.stage,
            progress: job.progress,
            error: job.error,
            reused: job.reused,
          }}
        />
      </div>
    );
  }

  // A confirmed syllabus is edited inside its exam pod, under its Syllabus tab.
  if (state === "confirmed") redirect(`/pods/exam/${version.id}/syllabus`);

  return (
    <>
      <BackLink href="/pods" label="Pods" />
      <PageHeader
        title={version.title}
        description={subtitle}
        actions={<DeleteSyllabusButton versionId={version.id} />}
      />
      {(await canReadAgain(version)) ? (
        <div className="mb-5">
          <RereadNote versionId={version.id} />
        </div>
      ) : null}
      <SubjectsBoard
        versionId={version.id}
        initialTree={toEditableTree(version.subjects)}
        sourceText={version.parse?.extractedText ?? ""}
        warnings={version.parse?.warnings ?? []}
      />
    </>
  );
}

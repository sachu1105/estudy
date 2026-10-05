import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { SubjectFolder } from "@/features/syllabus/components/subject-folder";
import { syllabusState } from "@/features/syllabus/state";
import { toEditableTree } from "@/features/syllabus/to-tree";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { reviewService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Subject" };

export default async function SubjectFolderPage({
  params,
}: PageProps<"/syllabus/[id]/subjects/[subjectId]">) {
  const user = await requireUser();
  const { id, subjectId } = await params;
  const version =
    isId(id) && isId(subjectId) ? await reviewService.get(user, id) : null;
  const subject = version?.subjects.find((s) => s.id === subjectId);
  if (!version || !subject) notFound();

  return (
    <>
      <Link
        href={`/syllabus/${version.id}`}
        className="mb-3 -ml-1 inline-flex min-h-11 items-center gap-1 text-small font-medium text-ink-muted hover:text-ink md:min-h-0"
      >
        <ChevronLeft className="size-4" aria-hidden /> {version.title}
      </Link>
      <PageHeader title={subject.name} description={version.exam?.name} />
      <SubjectFolder
        versionId={version.id}
        subjectId={subject.id}
        initialTree={toEditableTree(version.subjects)}
        confirmed={syllabusState(version) === "confirmed"}
      />
    </>
  );
}

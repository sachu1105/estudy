import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { UploadForm } from "@/features/syllabus/components/upload-form";
import { requireUser } from "@/server/auth/session";
import { catalogueService, photosSupported } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Upload syllabus" };

export default async function NewSyllabusPage({
  searchParams,
}: PageProps<"/syllabus/new">) {
  await requireUser();
  const [query, exams] = await Promise.all([
    searchParams,
    catalogueService.listExams(),
  ]);
  const exam = typeof query.exam === "string" ? query.exam : undefined;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Upload syllabus"
        description="We read it and find the subjects and topics. You check the list before any plan is made."
      />
      <UploadForm
        exams={exams.map((e) => ({ id: e.id, name: e.name }))}
        initialExamId={exam}
        photos={photosSupported}
      />
    </div>
  );
}

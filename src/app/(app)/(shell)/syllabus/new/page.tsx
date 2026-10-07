import { ChevronRight, Library } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

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
      {/* The catalogue is the faster road when the exam is already there. */}
      <Link
        href="/syllabus/catalogue"
        className="-mt-4 mb-6 flex items-center gap-3 rounded-card border border-border bg-surface p-3 transition-colors duration-[120ms] hover:border-accent"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
          <Library className="size-5" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body font-medium text-ink">
            Is your exam in the catalogue?
          </span>
          <span className="text-small text-ink-muted">
            Its syllabus is already read and checked. Pick it instead.
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden />
      </Link>
      <UploadForm
        exams={exams.map((e) => ({ id: e.id, name: e.name }))}
        initialExamId={exam}
        photos={photosSupported}
      />
    </div>
  );
}

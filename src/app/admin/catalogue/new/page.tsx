import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { BuildSyllabusForm } from "@/features/admin/components/build-syllabus-form";
import { BackLink } from "@/features/pods/components/back-link";
import { isId } from "@/lib/ids";
import { adminService, requireAdmin } from "@/server/services/admin";
import { catalogueReader } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Build a syllabus · Admin" };

/**
 * An exam's official syllabus, built by an admin: read by its headings and lists, or by
 * the AI while it is switched on. Rule 5's gate applies either way.
 */
export default async function BuildSyllabusPage({
  searchParams,
}: PageProps<"/admin/catalogue/new">) {
  await requireAdmin("exams");
  const { exam } = await searchParams;
  const [exams, reader] = await Promise.all([
    adminService.exams(),
    catalogueReader(),
  ]);
  const examId =
    typeof exam === "string" && isId(exam) && exams.some((e) => e.id === exam)
      ? exam
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <BackLink href="/admin/catalogue" label="Catalogue" />
      <PageHeader
        title="Build a syllabus"
        description={
          reader.on
            ? "Paste the official syllabus, or fill it from the PDF. Read it by its own headings and lists, or with AI, then check every subject and topic before approving it."
            : "Paste the official syllabus, or fill it from the PDF. The text's own headings and lists are read, with no AI, then you check every subject and topic before approving it."
        }
      />
      {exams.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-6 text-center text-body text-ink-muted">
          No exams yet. Add the exam on the catalogue page first.
        </p>
      ) : (
        <BuildSyllabusForm
          exams={exams.map((e) => ({ id: e.id, name: e.name }))}
          examId={examId}
          reader={reader}
        />
      )}
    </div>
  );
}

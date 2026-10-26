import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { CatalogueReadStatus } from "@/features/admin/components/catalogue-read-status";
import { ReviewActions } from "@/features/admin/components/review-actions";
import { BackLink } from "@/features/pods/components/back-link";
import { SyllabusEditor } from "@/features/syllabus/components/syllabus-editor";
import { toEditableTree } from "@/features/syllabus/to-tree";
import { canAdmin } from "@/lib/admin/access";
import { isId } from "@/lib/ids";
import { adminService, requireAdmin } from "@/server/services/admin";
import { jobService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Review · Admin" };

/**
 * Side by side: what the syllabus says, and the tree users will study from. While it waits
 * for review, an admin who builds syllabuses edits the tree right here (it autosaves);
 * once approved it is fixed.
 */
export default async function ReviewPage({
  params,
}: PageProps<"/admin/catalogue/[versionId]">) {
  const admin = await requireAdmin("catalogue");
  const { versionId } = await params;
  const version = isId(versionId)
    ? await adminService.forReview(versionId)
    : null;
  if (!version || version.visibility !== "CATALOGUE") notFound();
  const topics = version.subjects.reduce((n, s) => n + s.topics.length, 0);
  // Given to the AI and not read yet: the job's status stands in for the tree.
  const job = version.parseId ? null : (version.parseJobs[0] ?? null);
  const readerOnline = job ? await jobService.readerOnline() : true;
  const editing = version.status === "PENDING" && canAdmin(admin.role, "exams");
  const sourceText =
    version.parse?.extractedText ||
    "No text: this one was read from page images or typed by hand.";

  return (
    <>
      <BackLink href="/admin/catalogue" label="Catalogue" />
      <PageHeader
        title={version.title}
        description={[
          version.exam?.name,
          `${version.subjects.length} subjects, ${topics} topics`,
          version.parse
            ? `read by ${version.parse.model} (${version.parse.promptVersion})`
            : job
              ? "being read by AI"
              : "typed by hand",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          version.status === "PENDING" && !job ? (
            <ReviewActions versionId={version.id} />
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge
          tone={
            version.status === "APPROVED"
              ? "success"
              : version.status === "REJECTED"
                ? "danger"
                : "accent"
          }
        >
          {version.status.toLowerCase()}
        </Badge>
        {version.promotedFromId ? (
          <Badge tone="outline">promoted from a user upload</Badge>
        ) : null}
        {version.reviewNote ? (
          <span className="text-small text-ink-muted">
            Note: {version.reviewNote}
          </span>
        ) : null}
      </div>
      {job ? (
        <CatalogueReadStatus
          versionId={version.id}
          examId={version.examId}
          job={{
            id: job.id,
            status: job.status,
            stage: job.stage,
            progress: job.progress,
            error: job.error,
            reused: job.reused,
          }}
          readerOnline={readerOnline}
        />
      ) : editing ? (
        <SyllabusEditor
          catalogue
          versionId={version.id}
          initialTree={toEditableTree(version.subjects)}
          sourceText={sourceText}
          warnings={[]}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section aria-labelledby="source" className="flex flex-col gap-2">
            <h2 id="source" className="text-h3">
              The syllabus text
            </h2>
            <pre className="max-h-[70dvh] overflow-auto rounded-card border border-border bg-surface p-4 font-sans text-small whitespace-pre-wrap">
              {sourceText}
            </pre>
          </section>
          <section aria-labelledby="tree" className="flex flex-col gap-2">
            <h2 id="tree" className="text-h3">
              Subjects and topics
            </h2>
            <ol className="flex max-h-[70dvh] flex-col gap-4 overflow-auto rounded-card border border-border bg-surface p-4">
              {version.subjects.map((s) => (
                <li key={s.id}>
                  <h3 className="text-body font-medium">{s.name}</h3>
                  <ul className="mt-1 flex flex-col gap-0.5 pl-3 text-small">
                    {s.topics.map((t) => (
                      <li key={t.id} className="flex justify-between gap-3">
                        <span>{t.name}</span>
                        <span className="shrink-0 font-mono text-ink-muted">
                          w{t.weight} d{t.difficulty}
                          {t.foundational ? " · basic" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}

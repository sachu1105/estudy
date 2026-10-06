import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { ReviewActions } from "@/features/admin/components/review-actions";
import { BackLink } from "@/features/pods/components/back-link";
import { isId } from "@/lib/ids";
import { adminService, requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Review · Admin" };

/** Side by side: what the syllabus says, and the tree users will study from. */
export default async function ReviewPage({
  params,
}: PageProps<"/admin/catalogue/[versionId]">) {
  await requireAdmin("catalogue");
  const { versionId } = await params;
  const version = isId(versionId)
    ? await adminService.forReview(versionId)
    : null;
  if (!version || version.visibility !== "CATALOGUE") notFound();
  const topics = version.subjects.reduce((n, s) => n + s.topics.length, 0);

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
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          version.status === "PENDING" ? (
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="source" className="flex flex-col gap-2">
          <h2 id="source" className="text-h3">
            The syllabus text
          </h2>
          <pre className="max-h-[70dvh] overflow-auto rounded-card border border-border bg-surface p-4 font-sans text-small whitespace-pre-wrap">
            {version.parse?.extractedText ||
              "No text: this one was read from page images or typed by hand."}
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
    </>
  );
}

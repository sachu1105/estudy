import { ChevronRight, Library } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { AddSyllabusDialog } from "@/features/admin/components/add-syllabus-dialog";
import { ExamForm } from "@/features/admin/components/exam-form";
import { canAdmin } from "@/lib/admin/access";
import { formatWhen } from "@/lib/admin/format";
import { cn } from "@/lib/utils/cn";
import { adminService, requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Catalogue · Admin" };

const TABS = [
  ["PENDING", "Waiting"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
] as const;

const EMPTY = {
  PENDING: "Nothing waiting. Add a syllabus to send one for review.",
  APPROVED: "No approved syllabuses yet.",
  REJECTED: "Nothing rejected.",
};

/**
 * The official syllabus for each exam, exam first: what users can pick today, what is
 * waiting for review, and the way to add one. Nothing reaches users unapproved (rule 5).
 */
export default async function AdminCatalogue({
  searchParams,
}: PageProps<"/admin/catalogue">) {
  const admin = await requireAdmin("catalogue");
  const query = await searchParams;
  const status = TABS.find(([s]) => s === query.status)?.[0] ?? "PENDING";
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const editor = canAdmin(admin.role, "exams");
  const [pending, approved, rejected, exams, uploads] = await Promise.all([
    adminService.catalogue("PENDING"),
    adminService.catalogue("APPROVED"),
    adminService.catalogue("REJECTED"),
    adminService.exams(),
    editor ? adminService.promotable(q) : [],
  ]);
  const lists = { PENDING: pending, APPROVED: approved, REJECTED: rejected };
  const versions = lists[status];

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="The official syllabus for each exam. Users pick one when they add an exam."
        actions={
          editor ? (
            <div className="flex flex-wrap gap-2">
              <ExamForm />
              <AddSyllabusDialog
                uploads={uploads}
                exams={exams.map((e) => ({ id: e.id, name: e.name }))}
                initialQuery={q}
              />
            </div>
          ) : null
        }
      />
      <div className="flex flex-col gap-10">
        <section aria-labelledby="exams" className="flex flex-col gap-3">
          <h2 id="exams" className="text-h3">
            Exams
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {exams.map((e) => {
              const live = approved.filter((v) => v.exam?.id === e.id);
              const waiting = pending.filter((v) => v.exam?.id === e.id);
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 pl-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
                    <Library className="size-5" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                      <span className="line-clamp-2 font-heading text-body font-medium break-words text-ink">
                        {e.name}
                      </span>
                      {waiting.length > 0 ? (
                        <Badge tone="accent" className="shrink-0">
                          {waiting.length} waiting
                        </Badge>
                      ) : null}
                    </span>
                    {live[0] ? (
                      <Link
                        href={`/admin/catalogue/${live[0].id}`}
                        className="truncate text-small text-accent-ink hover:underline"
                      >
                        {live[0].title}
                        {live.length > 1 ? ` +${live.length - 1} more` : ""}
                      </Link>
                    ) : (
                      <span className="truncate text-small text-ink-muted">
                        {e.board} · no syllabus yet
                      </span>
                    )}
                  </span>
                  {editor ? <ExamForm exam={e} /> : null}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="versions" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="versions" className="text-h3">
              Syllabuses
            </h2>
            <nav
              aria-label="Status"
              className="inline-flex rounded-control bg-surface-muted p-1"
            >
              {TABS.map(([s, label]) => (
                <Link
                  key={s}
                  href={`/admin/catalogue?status=${s}`}
                  aria-current={s === status ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-chip px-3 text-small font-medium transition-colors duration-[120ms]",
                    s === status
                      ? "bg-surface text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {label}
                  <span className="font-mono tabular-nums">
                    {lists[s].length}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
          {versions.length === 0 ? (
            <p className="rounded-card border border-dashed border-border px-4 py-6 text-center text-body text-ink-muted">
              {EMPTY[status]}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {versions.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/admin/catalogue/${v.id}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-muted"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-medium">
                        {v.title}
                      </span>
                      <span className="truncate text-small text-ink-muted">
                        {[
                          v.exam?.name ?? "No exam",
                          `${v._count.subjects} subjects`,
                          `updated ${formatWhen(v.updatedAt)}`,
                        ].join(" · ")}
                      </span>
                      {v.reviewNote ? (
                        <span className="text-small text-ink-muted">
                          Note: {v.reviewNote}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-ink-subtle"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

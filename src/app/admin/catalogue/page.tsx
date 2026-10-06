import { ChevronRight, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExamForm } from "@/features/admin/components/exam-form";
import { PromoteForm } from "@/features/admin/components/promote-form";
import { canAdmin } from "@/lib/admin/access";
import { formatWhen } from "@/lib/admin/format";
import { adminService, requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Catalogue · Admin" };

const TABS = [
  ["PENDING", "Waiting for review"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
] as const;

export default async function AdminCatalogue({
  searchParams,
}: PageProps<"/admin/catalogue">) {
  const admin = await requireAdmin("catalogue");
  const query = await searchParams;
  const status = TABS.find(([s]) => s === query.status)?.[0] ?? "PENDING";
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const editor = canAdmin(admin.role, "exams");
  const [versions, exams, promotable] = await Promise.all([
    adminService.catalogue(status),
    editor ? adminService.exams() : [],
    editor ? adminService.promotable(q) : [],
  ]);

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Syllabuses everyone can use. Nothing reaches users before it's approved (rule 5)."
      />
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3" aria-labelledby="versions">
          <h2 id="versions" className="sr-only">
            Catalogue syllabuses
          </h2>
          <nav aria-label="Status" className="flex flex-wrap gap-2">
            {TABS.map(([s, label]) => (
              <Button
                key={s}
                asChild
                variant={s === status ? "secondary" : "ghost"}
              >
                <Link
                  href={`/admin/catalogue?status=${s}`}
                  aria-current={s === status ? "page" : undefined}
                >
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
          {versions.length === 0 ? (
            <p className="text-body text-ink-muted">
              {status === "PENDING"
                ? "Nothing waiting. All reviewed."
                : "None yet."}
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
                          v.exam?.name,
                          `${v._count.subjects} subjects`,
                          `updated ${formatWhen(v.updatedAt)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {v.reviewNote ? (
                        <span className="text-small text-ink-muted">
                          Note: {v.reviewNote}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-ink-muted"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {editor ? (
          <>
            <section className="flex flex-col gap-3" aria-labelledby="exams">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="exams" className="text-h2">
                  Exams
                </h2>
                <ExamForm />
              </div>
              <ul className="divide-y divide-border rounded-card border border-border bg-surface">
                {exams.map((e) => (
                  <li
                    key={e.id}
                    className="flex min-h-14 items-center gap-3 px-4 py-2"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body font-medium">{e.name}</span>
                      <span className="text-small text-ink-muted">
                        {e.board} · {e._count.syllabuses} catalogue syllabuses
                      </span>
                    </span>
                    <ExamForm exam={e} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3" aria-labelledby="promote">
              <div className="flex flex-col gap-1">
                <h2 id="promote" className="text-h2">
                  Promote an upload
                </h2>
                <p className="text-body text-ink-muted">
                  To add an official syllabus: upload and confirm it as a normal
                  user, then promote it here.
                </p>
              </div>
              <form className="flex gap-2" role="search">
                <input type="hidden" name="status" value={status} />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Syllabus title"
                  aria-label="Search confirmed uploads"
                  className="max-w-md"
                />
                <Button type="submit" variant="secondary">
                  <Search aria-hidden /> Search
                </Button>
              </form>
              <ul className="divide-y divide-border rounded-card border border-border bg-surface">
                {promotable.map((v) => (
                  <li
                    key={v.id}
                    className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-medium">
                        {v.title}
                      </span>
                      <span className="truncate text-small text-ink-muted">
                        {v.owner?.email} · {v._count.subjects} subjects
                        {v.exam ? ` · ${v.exam.name}` : ""}
                      </span>
                    </span>
                    <Badge tone="outline">private</Badge>
                    <PromoteForm
                      sourceId={v.id}
                      title={v.title}
                      exams={exams.map((e) => ({ id: e.id, name: e.name }))}
                    />
                  </li>
                ))}
                {promotable.length === 0 ? (
                  <li className="px-4 py-3 text-body text-ink-muted">
                    No confirmed uploads match.
                  </li>
                ) : null}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

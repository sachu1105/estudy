import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminQuestion } from "@/features/admin/components/admin-question";
import { ImportQuestions } from "@/features/admin/components/import-questions";
import { QuestionDecide } from "@/features/admin/components/question-decide";
import { QuestionForm } from "@/features/admin/components/question-form";
import { ADMIN_PAGE_SIZE } from "@/server/repositories/admin-repository";
import {
  THIN_BELOW,
  questionAdmin,
  requireAdmin,
} from "@/server/services/admin";

export const metadata: Metadata = { title: "Questions · Admin" };

const TABS = [
  ["PENDING", "To check"],
  ["VERIFIED", "Verified"],
  ["SUPPRESSED", "Reported and out"],
] as const;

export default async function AdminQuestions({
  searchParams,
}: PageProps<"/admin/questions">) {
  await requireAdmin("questions");
  const query = await searchParams;
  const status = TABS.find(([s]) => s === query.status)?.[0] ?? "PENDING";
  const topic =
    typeof query.topic === "string" ? query.topic.slice(0, 100) : "";
  const page = Math.max(0, Number(query.page) || 0);
  const [[questions, total], thin] = await Promise.all([
    questionAdmin.list(status, topic, page),
    questionAdmin.thinPool(),
  ]);
  const pages = Math.ceil(total / ADMIN_PAGE_SIZE);
  const href = (p: number) =>
    `/admin/questions?${new URLSearchParams({ status, ...(topic ? { topic } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Questions"
        description="The practice pool. Nothing reaches a test until a person verifies it (rule 5)."
        actions={
          <div className="flex gap-2">
            <ImportQuestions />
            <QuestionForm />
          </div>
        }
      />
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3" aria-label="Questions">
          <nav aria-label="Status" className="flex flex-wrap gap-2">
            {TABS.map(([s, label]) => (
              <Button
                key={s}
                asChild
                variant={s === status ? "secondary" : "ghost"}
              >
                <Link
                  href={`/admin/questions?status=${s}`}
                  aria-current={s === status ? "page" : undefined}
                >
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
          <form className="flex gap-2" role="search">
            <input type="hidden" name="status" value={status} />
            <Input
              name="topic"
              defaultValue={topic}
              placeholder="Topic"
              aria-label="Filter by topic"
              className="max-w-md"
            />
            <Button type="submit" variant="secondary">
              <Search aria-hidden /> Filter
            </Button>
          </form>
          <p className="text-small text-ink-muted">
            {total} question{total === 1 ? "" : "s"}.
          </p>
          {status === "PENDING" && questions.length > 1 ? (
            <QuestionDecide
              ids={questions.map((q) => q.id)}
              decisions={["VERIFIED"]}
              all
            />
          ) : null}
          <ol className="flex flex-col gap-3">
            {questions.map((q) => (
              <AdminQuestion key={q.id} q={q} />
            ))}
          </ol>
          {pages > 1 ? (
            <nav
              aria-label="Pages"
              className="flex items-center justify-between gap-2"
            >
              {page > 0 ? (
                <Button asChild variant="ghost">
                  <Link href={href(page - 1)}>Previous</Link>
                </Button>
              ) : (
                <span />
              )}
              <span className="text-small text-ink-muted">
                Page {page + 1} of {pages}
              </span>
              {page + 1 < pages ? (
                <Button asChild variant="ghost">
                  <Link href={href(page + 1)}>Next</Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>

        <section aria-labelledby="thin" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="thin" className="text-h2">
              Topics that need questions
            </h2>
            <p className="text-body text-ink-muted">
              Catalogue topics with fewer than {THIN_BELOW} verified questions;
              their check tests can&apos;t run yet.
            </p>
          </div>
          {thin.length === 0 ? (
            <p className="text-body text-ink-muted">
              Every catalogue topic has enough.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {thin.slice(0, 50).map((t) => (
                <li
                  key={t.key}
                  className="flex flex-wrap items-center gap-3 px-4 py-2"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body">{t.name}</span>
                    <span className="text-small text-ink-muted">
                      {t.subject.name} · {t.subject.syllabusVersion.title}
                    </span>
                  </span>
                  <span className="font-mono text-small tabular-nums">
                    {t.count} / {THIN_BELOW}
                  </span>
                </li>
              ))}
              {thin.length > 50 ? (
                <li className="px-4 py-2 text-small text-ink-muted">
                  And {thin.length - 50} more.
                </li>
              ) : null}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

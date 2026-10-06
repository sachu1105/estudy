import { ChevronRight, ClipboardCheck, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StartTestButton } from "@/features/tests/components/start-test-button";
import { formatMinutes } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/entitlements";
import { podService } from "@/server/services/pods";
import { testService } from "@/server/services/tests";

export const metadata: Metadata = { title: "Tests" };

export default async function TestsPage() {
  const user = await requireUser();
  const [{ exams }, history] = await Promise.all([
    podService.exams(user),
    testService.history(user),
  ]);
  const materialMocks = can(user, "vaultMocksPerMonth");

  return (
    <>
      <PageHeader
        title="Tests"
        description="Practice questions written for these exams, checked by people. Not the official papers."
      />
      <div className="flex flex-col gap-10">
        {exams.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No exam yet"
            description="Add your exam's syllabus in Pods; its topics, sections and full mocks show up here."
          />
        ) : (
          exams.map((exam) => (
            <section
              key={exam.id}
              aria-labelledby={`exam-${exam.id}`}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id={`exam-${exam.id}`} className="text-h2">
                  {exam.title}
                </h2>
                <StartTestButton
                  kind="exam"
                  id={exam.id}
                  label="Full mock"
                  variant="primary"
                />
              </div>
              <ul className="divide-y divide-border rounded-card border border-border bg-surface">
                {exam.pods.map((pod) => (
                  <li
                    key={pod.id}
                    className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2"
                  >
                    <span className="min-w-0 flex-1 text-body">{pod.name}</span>
                    {pod.subjectId ? (
                      <StartTestButton
                        kind="subject"
                        id={pod.subjectId}
                        label="Section mock"
                        icon={false}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <section className="flex items-start gap-3 rounded-card border border-border bg-surface p-4 md:p-5">
          <Lock className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
          <div className="flex flex-col gap-1">
            <h2 className="text-h3">Mock tests from your own material</h2>
            <p className="text-body text-ink-muted">
              {materialMocks
                ? "Questions written from your notes and PDFs, each pointing back to where its answer is. Coming soon on your plan."
                : "Questions written from your notes and PDFs, each pointing back to where its answer is. Part of the Pro and Elite plans, coming soon."}
            </p>
          </div>
        </section>

        <section aria-labelledby="history" className="flex flex-col gap-3">
          <h2 id="history" className="text-h2">
            Recent results
          </h2>
          {history.length === 0 ? (
            <p className="text-body text-ink-muted">
              No tests yet. Your check tests, section and full mocks show up
              here.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {history.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/tests/${a.mockTestId}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-muted"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body">
                        {a.mockTest.title}
                      </span>
                      <span className="text-small text-ink-muted">
                        {a.correct} of {a.total} right ·{" "}
                        {formatMinutes(
                          Math.max(1, Math.round(a.durationSec / 60)),
                        )}
                      </span>
                    </span>
                    <span className="font-mono text-body tabular-nums">
                      {Math.round(a.accuracy * 100)}%
                    </span>
                    <ChevronRight
                      className="size-4 text-ink-muted"
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

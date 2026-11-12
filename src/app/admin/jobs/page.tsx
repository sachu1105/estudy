import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { JobActions } from "@/features/admin/components/job-actions";
import { formatWhen } from "@/lib/admin/format";
import { adminQueues } from "@/server/queue";
import { PARSE_QUEUE } from "@/server/queue/types";
import { requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Background jobs · Admin" };

/** Each queue in words an admin knows, and what runs in it. */
const ABOUT: Record<string, { title: string; runs: string }> = {
  [PARSE_QUEUE]: {
    title: "Syllabus reading",
    runs: "Reads each uploaded syllabus into subjects and topics.",
  },
  pods: {
    title: "Everything else",
    runs: "Link previews and file text for pods, Sunday re-plans, study reminders, squad ranks, plan expiry, exam dates and their reminders, and the trash.",
  },
};

// Active and completed are left out: one passes in a blink, the other only grows.
const COUNTS = [
  { key: "waiting", label: "Waiting" },
  { key: "delayed", label: "Scheduled" },
  { key: "failed", label: "Failed" },
] as const;

export default async function AdminJobs() {
  await requireAdmin("jobs");
  const queues = await adminQueues.overview().catch(() => null);
  const failed = queues
    ? await Promise.all(
        queues.map(async (q) => ({
          name: q.name,
          jobs: await adminQueues.failed(q.name),
        })),
      )
    : [];
  const noWorker = queues?.some((q) => q.workers === 0) ?? false;
  const waiting = queues?.reduce((n, q) => n + (q.counts.waiting ?? 0), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Background jobs"
        description="Slow work the app does away from the page, run by the worker process. Look here when something seems stuck."
      />
      <div className="flex flex-col gap-6">
        {queues === null ? (
          <p className="rounded-card border border-border bg-surface p-4 text-body">
            Redis can&apos;t be reached, so the queues can&apos;t be read. Check
            that it&apos;s running.
          </p>
        ) : (
          <>
            {noWorker ? (
              <p
                role="status"
                className="flex items-start gap-3 rounded-card border border-border bg-surface-muted p-4 text-body text-ink"
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>
                  The worker isn&apos;t running
                  {waiting ? `, so ${waiting} jobs are waiting` : ""}. Start it
                  with <code className="font-mono">pnpm worker</code> (the
                  worker container in production).
                </span>
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {queues.map((q) => (
                <section
                  key={q.name}
                  aria-label={ABOUT[q.name]?.title ?? q.name}
                  className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-h3">
                        {ABOUT[q.name]?.title ?? q.name}
                      </h2>
                      <span className="text-small text-ink-muted">
                        {q.workers
                          ? `${q.workers} worker${q.workers === 1 ? "" : "s"}`
                          : "No worker"}
                      </span>
                    </div>
                    <p className="text-small text-ink-muted">
                      {ABOUT[q.name]?.runs}
                    </p>
                  </div>
                  <dl className="grid grid-cols-3 gap-2">
                    {COUNTS.map((c) => (
                      <div key={c.key}>
                        <dt className="text-micro text-ink-muted uppercase">
                          {c.label}
                        </dt>
                        <dd className="font-mono text-h3 tabular-nums">
                          {q.counts[c.key] ?? 0}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
            <p className="text-small text-ink-muted">
              Scheduled jobs are the timed ones (nightly, Sunday, each morning)
              waiting for their hour.
              {failed.some((q) => q.jobs.length)
                ? " Failed jobs are listed below to try again or discard."
                : null}
            </p>
            {failed.map((q) =>
              q.jobs.length === 0 ? null : (
                <div key={q.name} className="flex flex-col gap-2">
                  <h2 className="text-h3">
                    Failed in {ABOUT[q.name]?.title.toLowerCase() ?? q.name}
                  </h2>
                  <ul className="divide-y divide-border rounded-card border border-border bg-surface">
                    {q.jobs.map((j) => (
                      <li
                        key={j.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3"
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="font-mono text-small">
                            {j.name} · {j.id}
                          </span>
                          <span className="text-small break-words text-ink-muted">
                            {j.reason || "No reason given"} · {j.attempts} tries
                            · {formatWhen(j.at)}
                          </span>
                        </span>
                        <JobActions queue={q.name} jobId={j.id} />
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </>
        )}
      </div>
    </>
  );
}

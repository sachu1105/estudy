import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { JobActions } from "@/features/admin/components/job-actions";
import { formatUsd, formatWhen } from "@/lib/admin/format";
import { adminQueues } from "@/server/queue";
import { adminService, requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Jobs and AI · Admin" };

const COUNTS = ["waiting", "active", "delayed", "failed", "completed"] as const;

export default async function AdminJobs() {
  await requireAdmin("jobs");
  const [queues, usage] = await Promise.all([
    adminQueues.overview().catch(() => null),
    adminService.aiUsage(),
  ]);
  const failed = queues
    ? await Promise.all(
        queues.map(async (q) => ({
          name: q.name,
          jobs: await adminQueues.failed(q.name),
        })),
      )
    : [];

  return (
    <>
      <PageHeader
        title="Jobs and AI"
        description="Background work, and what the AI has cost this month."
      />
      <div className="flex flex-col gap-10">
        {queues === null ? (
          <p className="rounded-card border border-border bg-surface p-4 text-body">
            Redis can&apos;t be reached, so the queues can&apos;t be read. Check
            that it&apos;s running.
          </p>
        ) : (
          <section aria-labelledby="queues" className="flex flex-col gap-3">
            <h2 id="queues" className="text-h2">
              Queues
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {queues.map((q) => (
                <div
                  key={q.name}
                  className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-mono text-body font-medium">
                      {q.name}
                    </h3>
                    <span className="text-small text-ink-muted">
                      {q.workers
                        ? `${q.workers} worker${q.workers === 1 ? "" : "s"}`
                        : "No worker running"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {COUNTS.map((c) => (
                      <div key={c}>
                        <dt className="text-micro text-ink-muted uppercase">
                          {c}
                        </dt>
                        <dd className="font-mono text-h3 tabular-nums">
                          {q.counts[c] ?? 0}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            {failed.map((q) =>
              q.jobs.length === 0 ? null : (
                <div key={q.name} className="flex flex-col gap-2">
                  <h3 className="text-h3">Failed in {q.name}</h3>
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
          </section>
        )}

        <section aria-labelledby="ai" className="flex flex-col gap-3">
          <h2 id="ai" className="text-h2">
            AI this month
          </h2>
          {usage.length === 0 ? (
            <p className="text-body text-ink-muted">No AI calls this month.</p>
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {usage.map((u) => (
                <li
                  key={`${u.provider}-${u.model}-${u.promptVersion}-${u.purpose}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body font-medium">
                      {u.purpose.toLowerCase().replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-small text-ink-muted">
                      {u.provider} · {u.model} · {u.promptVersion}
                    </span>
                  </span>
                  <span className="font-mono text-small text-ink-muted tabular-nums">
                    {u._count} calls ·{" "}
                    {(
                      (u._sum.inputTokens ?? 0) + (u._sum.outputTokens ?? 0)
                    ).toLocaleString("en-IN")}{" "}
                    tokens
                  </span>
                  <span className="font-mono text-body tabular-nums">
                    {formatUsd(u._sum.costMicros ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

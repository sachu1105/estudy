import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { ReportDecision } from "@/features/admin/components/report-decision";
import { formatWhen } from "@/lib/admin/format";
import { adminService, requireAdmin } from "@/server/services/admin";

export const metadata: Metadata = { title: "Reports · Admin" };

/** What people reported, one entry per thing reported, oldest first. */
export default async function AdminReports() {
  await requireAdmin("reports");
  const queue = await adminService.reports();
  return (
    <>
      <PageHeader
        title="Reports"
        description="Content people flagged. Hidden content stays in the database for the record."
      />
      {queue.length === 0 ? (
        <p className="text-body text-ink-muted">Nothing reported. All clear.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.map((q) => (
            <li
              key={`${q.type}-${q.id}`}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {q.target ? (
                  <Link
                    href={q.target.href}
                    className="text-body font-medium text-accent-ink hover:underline"
                  >
                    {q.target.label}
                  </Link>
                ) : (
                  <span className="text-body text-ink-muted">
                    Already deleted
                  </span>
                )}
                <span className="text-small text-ink-muted">
                  {q.reports.length} report{q.reports.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="flex flex-col gap-1 text-small">
                {q.reports.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">{r.reason}</span>
                    {r.note ? ` · "${r.note}"` : ""}{" "}
                    <span className="text-ink-muted">
                      · {r.by}, {formatWhen(r.at)}
                    </span>
                  </li>
                ))}
              </ul>
              <ReportDecision
                type={q.type}
                id={q.id}
                canHide={q.type !== "USER" && !!q.target && !q.target.hidden}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

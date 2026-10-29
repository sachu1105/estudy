import { Badge } from "@/components/ui/badge";

import { ReportCard, type SquadReport } from "./report-card";

export type { SquadReport };

/**
 * What members reported in the squad, for its owner, admins and moderators. Who reported
 * is never shown here; the site admins see every report too.
 */
export function SquadReports({
  groupId,
  reports,
  canSetRole,
  canSetAdmin,
}: {
  groupId: string;
  reports: SquadReport[];
  /** The viewer's powers over the people reported (they outrank all of them). */
  canSetRole: boolean;
  canSetAdmin: boolean;
}) {
  return (
    <section
      id="reports"
      aria-labelledby="reports-heading"
      className="flex scroll-mt-6 flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2 id="reports-heading" className="flex items-center gap-2 text-h3">
          Reports
          <Badge>{reports.length}</Badge>
        </h2>
        <p className="text-small text-ink-muted">
          Members flagged these. Who reported stays private.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {reports.map((r) => (
          <ReportCard
            key={`${r.type}:${r.id}`}
            groupId={groupId}
            report={r}
            canSetRole={canSetRole}
            canSetAdmin={canSetAdmin}
          />
        ))}
      </ul>
    </section>
  );
}

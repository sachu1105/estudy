import { CATEGORY_LABEL } from "@/lib/feedback/schemas";

import type { ProblemItem } from "../types";
import { ProblemStatusBadge } from "./status-badge";
import { TeamNote } from "./team-note";

/** What this person reported, newest first, with where each stands and the team's reply. */
export function ProblemList({ problems }: { problems: ProblemItem[] }) {
  if (problems.length === 0) return null;
  return (
    <section aria-labelledby="your-reports" className="flex flex-col gap-3">
      <h2 id="your-reports" className="text-h3">
        Your reports
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {problems.map((p) => (
          <li
            key={p.id}
            id={`problem-${p.id}`}
            className="flex scroll-mt-24 flex-col gap-2 px-4 py-3.5 sm:px-5"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
              <ProblemStatusBadge status={p.status} />
              <span>{CATEGORY_LABEL[p.category]}</span>
              <span aria-hidden>·</span>
              <span>{p.when}</span>
              {p.page ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="min-w-0 truncate">{p.page}</span>
                </>
              ) : null}
            </div>
            <p className="line-clamp-3 text-body wrap-break-word whitespace-pre-wrap text-ink">
              {p.body}
            </p>
            {p.teamNote ? <TeamNote note={p.teamNote} /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

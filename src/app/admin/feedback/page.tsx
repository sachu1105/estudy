import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import {
  decideIdeaAction,
  decideProblemAction,
} from "@/features/feedback/actions";
import { DecideForm } from "@/features/feedback/components/admin/decide-form";
import { RatingSummary } from "@/features/feedback/components/admin/rating-summary";
import { TeamIdea } from "@/features/feedback/components/admin/team-idea";
import {
  IdeaStatusBadge,
  ProblemStatusBadge,
} from "@/features/feedback/components/status-badge";
import { formatWhen } from "@/lib/admin/format";
import {
  AREA_LABEL,
  CATEGORY_LABEL,
  IDEA_STATUSES,
  IDEA_STATUS_LABEL,
  PROBLEM_STATUSES,
  PROBLEM_STATUS_LABEL,
} from "@/lib/feedback/schemas";
import { cn } from "@/lib/utils/cn";
import { requireAdmin } from "@/server/services/admin";
import { feedbackService } from "@/server/services/feedback";

export const metadata: Metadata = { title: "Feedback · Admin" };

const TABS = ["problems", "ideas", "ratings"] as const;
type Tab = (typeof TABS)[number];

const OPEN_PROBLEM = new Set(["RECEIVED", "LOOKING"]);

/** Problem reports, ideas to review and decide, and how people rate the app. */
export default async function AdminFeedback({
  searchParams,
}: PageProps<"/admin/feedback">) {
  await requireAdmin("feedback");
  const raw = (await searchParams).tab;
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "problems";
  const data = await feedbackService.adminOverview();

  // Open reports first, newest first; ideas waiting for review first, then by votes.
  const problems = [...data.problems].sort(
    (a, b) =>
      Number(OPEN_PROBLEM.has(b.status)) - Number(OPEN_PROBLEM.has(a.status)),
  );
  const ideas = [...data.ideas].sort(
    (a, b) => Number(b.status === "REVIEW") - Number(a.status === "REVIEW"),
  );
  const waiting = {
    problems: problems.filter((p) => OPEN_PROBLEM.has(p.status)).length,
    ideas: ideas.filter((i) => i.status === "REVIEW").length,
    ratings: data.ratings.total,
  };
  const label = { problems: "Problems", ideas: "Ideas", ratings: "Ratings" };

  return (
    <>
      <PageHeader
        title="Feedback"
        description="What people asked for and what went wrong for them. Status changes and replies reach them as a notification."
        actions={tab === "ideas" ? <TeamIdea /> : undefined}
      />
      <nav
        aria-label="Feedback"
        className="mb-5 flex gap-5 overflow-x-auto border-b border-border"
      >
        {TABS.map((key) => (
          <Link
            key={key}
            href={`/admin/feedback?tab=${key}`}
            aria-current={key === tab ? "page" : undefined}
            className={cn(
              "-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 font-heading text-body font-medium",
              key === tab
                ? "border-accent text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {label[key]}
            <span className="font-mono text-micro text-ink-subtle tabular-nums">
              {waiting[key]}
            </span>
          </Link>
        ))}
      </nav>

      {tab === "problems" ? (
        problems.length === 0 ? (
          <p className="text-body text-ink-muted">
            No problems reported. All clear.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {problems.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
                  <ProblemStatusBadge status={p.status} />
                  <span className="font-medium text-ink">
                    {CATEGORY_LABEL[p.category]}
                  </span>
                  <span>
                    · {p.user.displayName} ({p.user.email}),{" "}
                    {formatWhen(p.createdAt)}
                  </span>
                </div>
                <p className="text-body wrap-break-word whitespace-pre-wrap">
                  {p.body}
                </p>
                {p.page || p.device ? (
                  <p className="text-small wrap-break-word text-ink-muted">
                    {p.page ? <>Where: {p.page}</> : null}
                    {p.page && p.device ? " · " : null}
                    {p.device ? <>Browser: {p.device}</> : null}
                  </p>
                ) : null}
                <DecideForm
                  id={p.id}
                  status={p.status}
                  teamNote={p.teamNote}
                  statuses={PROBLEM_STATUSES}
                  labels={PROBLEM_STATUS_LABEL}
                  action={decideProblemAction}
                />
              </li>
            ))}
          </ul>
        )
      ) : tab === "ideas" ? (
        ideas.length === 0 ? (
          <p className="text-body text-ink-muted">
            No ideas yet. Ask people whether they&apos;d use something
            you&apos;re thinking of.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ideas.map((i) => (
              <li
                key={i.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
                  <IdeaStatusBadge status={i.status} />
                  {i.fromTeam ? (
                    <Badge tone="accent">From the team</Badge>
                  ) : null}
                  <span className="font-mono tabular-nums">
                    {i.votes} {i.votes === 1 ? "vote" : "votes"}
                  </span>
                  <span>
                    · {AREA_LABEL[i.area]} · {i.author.displayName},{" "}
                    {formatWhen(i.createdAt)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-h3 wrap-break-word">{i.title}</h2>
                  {i.body ? (
                    <p className="text-body wrap-break-word whitespace-pre-wrap text-ink-muted">
                      {i.body}
                    </p>
                  ) : null}
                </div>
                <DecideForm
                  id={i.id}
                  status={i.status}
                  teamNote={i.teamNote}
                  statuses={IDEA_STATUSES}
                  labels={IDEA_STATUS_LABEL}
                  action={decideIdeaAction}
                />
              </li>
            ))}
          </ul>
        )
      ) : (
        <RatingSummary
          counts={data.ratings.counts}
          total={data.ratings.total}
          average={data.ratings.average}
          recent={data.ratings.recent.map((r) => ({
            stars: r.stars,
            note: r.note,
            by: r.user.displayName,
            when: formatWhen(r.updatedAt),
          }))}
        />
      )}
    </>
  );
}
